/**
 * @author Francis Carelse
 * @git user: fcarelse
 * Basic Chat dialog box
 */

(function(){
// Start of enclosed scope

class FXCDialogChat extends HTMLElement {
	static baseState = {
		id: 0,
		name: 'Unnamed Dialog',
		title: 'Dialog Title',
		isDragging: false,
		isHidden: false,
		xDiff: 0,
		yDiff: 0,
		x: 100,
		y: 100,
		body: 'Chat open ...\n',
		marginTop: 1,
		marginBottom: 1,
		marginLeft: 1,
		marginRight: 1,
	};

	static nextID = 1;
	static instances = [];

  constructor () {
    super()
		FXCDialogChat.instances.push(this);
		this.id = this.id || 'FXCDialogChat'+FXCDialogChat.nextID++;
		this.attachShadow({mode: 'open'});
		const element = this;

		// Setup State
		const state = this.state = {};
		Object.assign(this.state, FXCDialogChat.baseState, {id: this.id});

		// Setup Update Properties
		state.title = this.title || state.title;
		'title body x y'.split(' ').forEach(declareUpdateProperty);
		
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
			element.dispatchEvent(new CustomEvent('moving', {detail: {id: this.id, element}}))
		}
		this.onMouseUp = function(e){
			e.preventDefault();
			state.isDragging=false;
			setTimeout(()=>{
				state.stopClick=false
				element.dispatchEvent(new CustomEvent('placed', {detail: {id: this.id, element}}))
			},100);
		}

		this.receive = function({user, message}){
			element.body += `${user.name}: ${message}\n`;
			element.dispatchEvent(new CustomEvent('received', {detail: {id: this.id, element, user, message}}))
		}

		this.onSend = function(e){
			e.preventDefault();
			const messageElement = element.shadowRoot.querySelector('#message');
			const message = messageElement.value;
			if(message == '') return;
			messageElement.value = '';
			// Support for Node Hosting Manager
			const user = window.nhm instanceof Object?
				nhm.User.user.id:
				{name: 'You', type: 'guest', id: 0};
			element.body += `${user.name}: ${message}\n`;
			element.dispatchEvent(new CustomEvent('send', {detail: {id: this.id, element, user, message}}))
		}

		this.clampX = function(n) {
			return Math.min(Math.max(n, state.marginLeft + 1),
				clientWidth() - elementWidth(this) - offsetX() - state.marginRight + 3);
		}
		this.clampY = function(n) {
			return Math.min(Math.max(n, state.marginTop + 1),
				clientHeight() - elementHeight(this) - offsetY() - state.marginBottom + 3);
		}

		function declareUpdateProperty(prop){
			Object.defineProperty(element, prop, {
				set: function(value) { element.state[prop] = value; element.update()},
				get: function(){ return element.state[prop]; }
			});
		}

		this.render();
	}

	update(){
		this.dispatchEvent(new CustomEvent(`updating`,{detail: {id: this.id, element: this}}))
		this.state.x = this.clampX(this.state.x);
		this.state.y = this.clampY(this.state.y);
		this.dispatchEvent(new CustomEvent(`updated`,{detail: {id: this.id, element: this}}))
		// This can be used to make a more efficient update, rather than a full re-render of the innerHTML.
		// But not being efficient here at the moment, just re-rendering.
		this.render();
	}

	render(){
		this.shadowRoot.innerHTML = html`
${genStyles.apply(this)}
<div class="dialog" id="dialog">
	<div class="header" id="handle">${this.title}</div>
	<pre class="body">${this.body}</pre>
	<div class="footer">
		<input class="message" id="message" placeholder="Enter message here" type="text"/>
		<div class="send" id="send">Send</div>
	</div>
</div>`
		this.shadowRoot.querySelector('#handle').addEventListener('mousedown', this.onMouseDown);
		this.shadowRoot.querySelector('#dialog').addEventListener('mousemove', this.onMouseMove);
		this.shadowRoot.querySelector('#dialog').addEventListener('mouseup', this.onMouseUp);
		this.shadowRoot.querySelector('#send').addEventListener('click', this.onSend);
		this.dispatchEvent(new CustomEvent(`rendered`,{detail: {id: this.id, element: this}}))
  }
}

window.customElements.define('fxc-dialog-chat', FXCDialogChat)

// Support Functions
function offsetX(){
	const px = getComputedStyle(document.body, null).getPropertyValue('padding-left');
	const mx = getComputedStyle(document.body, null).getPropertyValue('margin-left');
	return pxToInt(px) + pxToInt(mx);
}
function offsetY(){
	const py = getComputedStyle(document.body, null).getPropertyValue('padding-top');
	const my = getComputedStyle(document.body, null).getPropertyValue('margin-top');
	return pxToInt(py) + pxToInt(my);
}
function clientWidth(){
	return document.documentElement.clientWidth;
}
function clientHeight(){
	return document.documentElement.clientHeight;
}
function elementWidth(element){
	const computed = getComputedStyle(element, null)
	return pxToInt(computed.getPropertyValue('width'))
		// +pxToInt(computed.getPropertyValue('marginLeft'))
		// +pxToInt(computed.getPropertyValue('marginRight'))

}
function elementHeight(element){
	const computed = getComputedStyle(element, null)
	return pxToInt(computed.getPropertyValue('height'))
		// +pxToInt(computed.getPropertyValue('marginTop'))
		// +pxToInt(computed.getPropertyValue('marginBottom'))
}

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

function genStyles(){ return html`<style>
	:host {
		z-index: 20001;
		border: 1px solid purple;
		margin: 0px;
		padding: 1px;
		background-color: white;
		width: 300px;
		height: 332px;
		position: fixed;
		top: 0;
		left: 0;
		visibility: ${this.state.isHidden?'hidden':''};
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
		height: 270px;
		max-height: 270px;
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
	.hide{
		visibility: hidden;
	}
</style>`}

// End of enclosed scope
})();
