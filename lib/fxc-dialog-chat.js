/**
 * @author Francis Carelse
 * @git user: fcarelse
 * Basic Chat dialog box
 */

(function(){
// Start of enclosed scope

class FXCDialogChat extends HTMLElement {
	static DEFAULT_USER = {name: 'You', type: 'guest', id: 0};
	static nextID = 1;
	static instances = [];

	constructor () {
		super()
		FXCDialogChat.instances.push(this);
		this.attachShadow({mode: 'open'});
		const element = this;

		// Setup State
		const state = this.state = genState.apply(this);
		(function(_id){ // Set readonly _id on state and element. Ensuring Uniqueness
			Object.defineProperty(state, '_id', { get(){ return _id } })
			Object.defineProperty(element, '_id', { get(){ return _id } })
		})(FXCDialogChat.nextID++);
		this.id = this.id || 'FXCDialogChat' + this._id;

		// Setup User (Use Node Hosting Manager User if available)
		if(window.nhm instanceof Object && nhm.User instanceof Object && nhm.User.watch instanceof Function){
			nhm.User.watch('user', onChangedUser);
			onChangedUser();
		} else {
			state.user = {...FXCDialogChat.DEFAULT_USER};
		}
		
		function onChangedUser(){
			this.user = nhm.User.user instanceof Object?
				{...nhm.User.user}:
				{...FXCDialogChat.DEFAULT_USER};
		}

		this.onMouseMove = function(e){
			if(state.isDragging){
				element.x = state.x = element.clampX(e.pageX - state.xDiff);
				element.y = state.y = element.clampY(e.pageY - state.yDiff);
				state.stopClick=true;
			}
		}
		this.onMouseDown = function(e){
			e.preventDefault();
			state.isDragging=true;
			state.xDiff = e.pageX - state.x;
			state.yDiff = e.pageY - state.y;
			element.dispatchEvent(new CustomEvent('moving', {detail: {id: element.id, element}}))
			element.setToTop();
		}
		this.onMouseUp = function(e){
			e.preventDefault();
			state.isDragging=false;
			setTimeout(()=>{
				state.stopClick=false
				element.dispatchEvent(new CustomEvent('placed', {detail: {id: element.id, element}}))
			},100);
		}

		// Method for receiving message from system
		this.receive = function({user, message}){
			element.body += `${user.name}: ${message}\n`;
			element.dispatchEvent(new CustomEvent('received', {detail: {id: element.id, element, user: {...user}, message}}))
		}

		// Handler method for the Sending Event
		this.onSend = function(e){
			e.preventDefault();
			const messageElement = element.shadowRoot.querySelector('#message');
			const message = messageElement.value;
			if(message == '') return;
			messageElement.value = '';
			element.body += `${element.user.name}: ${message}\n`;
			element.dispatchEvent(new CustomEvent('send', {detail: {id: element.id, element, user: {...state.user}, message}}))
		}

		this.open = this.show = () => this.hide = false;
		this.close = this.hide = () => this.hide = true;

		this.setToTop = ()=>{
			this.state.z = FXCDialogChat.instances.length + 1;
			FXCDialogChat.instances.sort((a,b)=>
				a.state.z == b.state.z? 0:
				a.state.z > b.state.z? 1: -1
			).forEach((inst, i)=>inst.z = i);
		}

		this.clampX = function(n) {
			const clientWidth = document.documentElement.clientWidth;
			const computedElement = getComputedStyle(element, null);
			const elementWidth = pxToInt(computedElement.getPropertyValue('width'))
				// +pxToInt(computedElement.getPropertyValue('marginLeft'))
				// +pxToInt(computedElement.getPropertyValue('marginRight'))
			const computedBody = getComputedStyle(document.body, null)
			const offsetX = pxToInt(computedBody.getPropertyValue('padding-left')) +
				pxToInt(computedBody.getPropertyValue('margin-left'));
			return Math.min(Math.max(n, state.marginLeft + 1),
				clientWidth - elementWidth - offsetX - state.marginRight + 3);
		}

		this.clampY = function(n) {
			const clientHeight = document.documentElement.clientHeight;
			const computedElement = getComputedStyle(element, null);
			const elementHeight = pxToInt(computedElement.getPropertyValue('height'))
				// +pxToInt(computedElement.getPropertyValue('marginTop'))
				// +pxToInt(computedElement.getPropertyValue('marginBottom'))
			const computedBody = getComputedStyle(document.body, null)
			const offsetY = pxToInt(computedBody.getPropertyValue('padding-top')) +
				pxToInt(computedBody.getPropertyValue('margin-top'));
			return Math.min(Math.max(n, state.marginTop + 1),
				clientHeight - elementHeight - offsetY - state.marginBottom + 3);
		}

		// Declare Update Properties
		'title body x y z hide user'.split(' ').forEach(prop=>{
			Object.defineProperty(element, prop, {
				set: function(value) { element.state[prop] = value; element.update(prop)},
				get: function(){ return element.state[prop]; }
			});
		});

		// Build contents
		this.shadowRoot.innerHTML = html`
${genStyles.apply(this)}
<div class="dialog">
	<div class="header">${this.title}
		<div class="close">X</div>
	</div>
	<pre class="body">${this.body}</pre>
	<div class="footer">
		<input class="message" id="message" placeholder="Enter message here" type="text"/>
		<div class="send" id="send">Send</div>
	</div>
</div>`

		// Set event handlers
		this.shadowRoot.querySelector('.header').addEventListener('mousedown', this.onMouseDown);
		if(!this.state.rendered){
			document.addEventListener('mousemove', this.onMouseMove);
			document.addEventListener('mouseup', this.onMouseUp);
		}
		this.shadowRoot.querySelector('.send').addEventListener('click', this.onSend);
		this.shadowRoot.querySelector('.message').addEventListener('keypress', (e)=>e.code=='Enter' && this.onSend(e));
		this.shadowRoot.querySelector('.close').addEventListener('click', this.close);
		this.addEventListener('focus', this.setToTop);
		this.state.rendered = true;
		this.dispatchEvent(new CustomEvent('rendered',{detail: {id: element.id, element}}));

		// End of constructor method
	}

	update(prop){
		if(!this.state.rendered) return console.error('Update before Rendered');
		const {id} = this;
		const element = this;
		this.dispatchEvent(new CustomEvent('updating',{detail: {id, element, prop}}))
		this.dispatchEvent(new CustomEvent('updating.'+prop,{detail: {id, element, prop}}))
		switch(prop){
			case 'x': case 'y': {
				this.state.x = this.clampX(this.state.x);
				this.state.y = this.clampY(this.state.y);
				this.style.transform = `translate(${this.x}px, ${this.y}px`;
			} break;
			case 'z': {
				this.style.zIndex = 20000 + this.state.z;
			} break;
			case 'title': {
				this.shadowRoot.querySelector('.header').innerHTML = this.state.title;
			} break;
			case 'body': {
				this.shadowRoot.querySelector('.body').innerHTML = this.state.body;
			} break;
			case 'hide': {
				this.style.visibility = this.state.hide? 'hidden': '';
				this.dispatchEvent(new CustomEvent(this.state.hide? 'hide': 'show', {detail: {id, element}}))
			} break;
			case 'user': {
			} break;
		}
		this.dispatchEvent(new CustomEvent('updated.'+prop,{detail: {id, element, prop}}))
		this.dispatchEvent(new CustomEvent('updated',{detail: {id, element, prop}}))
	}
} // End of Class

// Support Functions
function pxToInt(px){
	return parseInt(px.toString().match(/\d+/) || '0');
}

// Technically does nothing, but triggers lit-plugin for vscode to treat template literal string as html code.
function html(strArr, ...args){
	let str = '';
	for(let i=0; i<strArr.length; str+=(args[i++] ?? '')) str+=strArr[i];
	return str;
}

// Simplified feature of lit-html to be used later as needed.
function classMap(map){
	return Object.keys(map).filter(key=>!!map[key]).join(' ')
}

//Helper generate state [apply to this for caller context]
function genState(){
	return {
		id: FXCDialogChat.nextID,
		name: 'Unnamed Dialog',
		title: this.title || 'Dialog Title',
		user: {...FXCDialogChat.DEFAULT_USER},
		isDragging: false,
		hide: false,
		xDiff: 0,
		yDiff: 0,
		x: 100,
		y: 100,
		z: FXCDialogChat.instances.length,
		body: 'Chat open ...\n',
		marginTop: 1,
		marginBottom: 1,
		marginLeft: 1,
		marginRight: 1,
		rendered: false,
	};
}

//Helper generate styles [apply to this for caller context]
function genStyles(){ return html`<style>
	:host {
		z-index: ${20000 + this.z};
		border: 1px solid purple;
		margin: 0px;
		padding: 1px;
		background-color: white;
		position: fixed;
		top: 0;
		left: 0;
		visibility: ${this.state.hide?'hidden':''};
		transform: translate(${this.x}px, ${this.y}px);
	}
	div{
		margin: 0;
		padding: 0;
		border: 0;
		font-family: sans-serif;
		font-size: 1rem;
		font-weight: 400;
		line-height: 1;
	}

	.header{
		cursor: move;
		margin: 0px;
		padding: 2px;
		border: 0px solid red;
		background-color: #666666;
		color: white;
		height: 24px;
		line-height: 1.5;
		vertical-align: middle;
		text-align: center;
	}
	.body{
		margin: 0px;
		padding: 2px;
		min-height: 200px;
		max-height: 200px;
		overflow: auto;
		border: 0px solid blue;
	}
	.footer{
		margin: 0px;
		cursor: text;
		background-color: #BBBBBB;
		color: black;
		line-height: 1;
		height: 30px;
		width: 100%;
		vertical-align: middle;
		display: flex;
		flex-flow: row nowrap;
		justify-content: space-between;
		align-items: center;
	}
	.message{
		margin: 0px;
		padding: 0px;
		padding-left: 5px;
		border: 1px solid #666666;
		background-color: #BBBBBB;
		height: 28px;
		width: 250px;
		font-size: .8rem;
		vertical-align: middle;
	}
	.send{
		cursor: pointer;
		display: flex-item;
		margin: 0px;
		padding: 0px;
		padding-top: 7px;
		border: 0px solid brown;
		background-color: #CCCCCC;
		color: black;
		height: 23px;
		width: 50px;
		vertical-align: middle;
		text-align: center;
	}
	.close{
		cursor: pointer;
		display: inline-block;
		position: absolute;
		background-color: #666666;
		top: 2px;
		right: 5px;
		margin: 0px;
		padding: 0px;
		color: #ff2222;
		width: 14px;
		height: 14px;
		padding-left: 2px;
		padding-top: 2px;
		line-height: 1.5;
		font-weight: bold;
	}
	.hide{
		visibility: hidden;
	}
</style>`}

try{ // Export for browser environment
	if(window instanceof Object && window.customElements instanceof Object)
		window.customElements.define('fxc-dialog-chat', FXCDialogChat);
} catch(e){} // Not in browser environment

try{ // Export for commonJS environment
	if(module instanceof Object && module.exports instanceof Object)
		Object.assign(module.exports, {default: FXCDialogChat, FXCDialogChat});
} catch(e){} // Not in commonJS environment

// End of enclosed scope
})();
