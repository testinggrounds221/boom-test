import './boardEditor.js'
const formEl = document.querySelectorAll('#joinForm > div > input')
const joinButtonEl = document.querySelector('#joinButton')
const messageEl = document.querySelector('#message')
const statusEl = document.querySelector('#status')
const roomsListEl = document.getElementById('roomsList');
const myAudioEl = document.getElementById('myAudio');
const singlePlayerEl = document.getElementById('singlePlayer');
const multiPlayerEl = document.getElementById('multiPlayer');
const totalRoomsEl = document.getElementById('rooms')
const totalPlayersEl = document.getElementById('players')
const ChatEl = document.querySelector('#chat')
const sendButtonEl = document.querySelector('#send')
const chatContentEl = document.getElementById('chatContent')
const isBoomAllowedEle = document.getElementById('isBoomAllowed');
const loadGameFieldSetEle = document.getElementById('loadGameFieldSet');
const loadGame = document.getElementById('loadGame');
loadGame.checked = false
loadGameFieldSetEle.style.display = loadGame.checked ? null : "none"

var config = {};
var board = null;
var game = new Chess()
var turnt = 0;

var time_in_minutes = 30;
var current_time = null;
var deadline = null;
var paused = false;
var time_left;
var timeinterval;

// initializing semantic UI dropdown
$('.ui.dropdown')
	.dropdown();
$("#dialog").dialog({
	autoOpen: false
});

// function for defining onchange on dropdown menus
$("#roomDropdown").dropdown({
	onChange: function (val) {
		// console.log(val)
		// console.log('running the function')
		formEl[1].value = val
	}
});


function onDragStart2(source, piece, position, orientation) {
	// do not pick up pieces if the game is over
	if (game.game_over()) {
		if (game.in_draw()) {
			alert('Game Draw!!');
		}
		else if (game.in_checkmate())
			if (turnt === 1) {
				alert('You won the game!!');
			} else {
				alert('You lost!!');
			}
		return false
	}

	// only pick up pieces for White
	if (piece.search(/^b/) !== -1) return false
}

function makeRandomMove() {
	var possibleMoves = game.moves()

	// game over
	if (possibleMoves.length === 0) {
		return;
	}

	var randomIdx = Math.floor(Math.random() * possibleMoves.length)
	game.move(possibleMoves[randomIdx]);
	myAudioEl.play();
	turnt = 1 - turnt;
	board.position(game.fen());
}

function onDrop2(source, target) {
	// see if the move is legal
	var move = game.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a queen for example simplicity
	})
	myAudioEl.play();
	// illegal move
	if (move === null) return 'snapback'
	turnt = 1 - turnt;
	// make random legal move for black
	window.setTimeout(makeRandomMove, 250)
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd2() {
	board.position(game.fen())
}

singlePlayerEl.addEventListener('click', (e) => {
	e.preventDefault();
	let isBoomAllowed = document.querySelector('#isBoomAllowed').checked
	let playWithComp = document.querySelector('#playWithComp').checked
	let loadGameBool = document.querySelector('#loadGame').checked
	let loadGameType = "none"
	if (loadGameBool) {
		if (document.querySelector('#isLoadFEN').checked) loadGameType = "fen"
		if (document.querySelector('#isLoadSAN').checked) loadGameType = "san"
	}

	if (isBoomAllowed)
		location.href = `singlePlayerBoomChess.html?isBoomAllowed=${isBoomAllowed}&playWithComp=${playWithComp}&loadGame=${loadGameBool}&loadGameType=${loadGameType}`
	else
		location.href = `singlePlayerBoomChess.html?isBoomAllowed=false&playWithComp=false&loadGame=${loadGameBool}&loadGameType=${loadGameType}`


})

multiPlayerEl.addEventListener('click', (e) => {
	e.preventDefault();
	// console.log("Heyyy")
	let loadGame = document.querySelector('#loadGame').checked
	location.href = `multiplayerBoomChess.html?loadGame=${loadGame}`
})

isBoomAllowedEle.addEventListener('change', () => {
	let playWithCompEle = document.getElementById("playWtCmDiv")
	if (isBoomAllowedEle.checked)
		playWithCompEle.style.display = 'block'
	else
		playWithCompEle.style.display = 'none'

})

loadGame.addEventListener('change', () => {
	loadGameFieldSetEle.style.display = loadGame.checked ? null : "none"
})

function handleLGCheck(cb) {
	display("Clicked, new value = " + cb.checked);
	if (cb.checked) loadGameFieldSetEle.style.display = null
	else loadGameFieldSetEle.style.display = "none"
}
//Connection will be established after webpage is refreshed
const socket = io()

//Triggers after a piece is dropped on the board
function onDrop(source, target) {
	//emits event after piece is dropped
	pause_clock();
	var room = formEl[1].value;
	myAudioEl.play();
	// isMyTurn(false)
	socket.emit('Dropped', { source, target, room })
}

//Update Status Event
socket.on('updateEvent', ({ status, fen, pgn }) => {
	statusEl.textContent = status

})

socket.on('printing', (fen) => {
	// console.log(fen)
})

//Catch Display event
socket.on('DisplayBoard', (fenString, userId) => {
	// console.log(fenString)
	//This is to be done initially only
	if (userId != undefined) {
		current_time = Date.parse(new Date());
		deadline = new Date(current_time + time_in_minutes * 60 * 1000);
		messageEl.textContent = 'Match Started!! Best of Luck...'
		if (socket.id == userId) {
			config.orientation = 'black'
			run_clock('clck', deadline);
			pause_clock()
		} else {
			run_clock('clck', deadline);
		}
		document.getElementById('joinFormDiv').style.display = "none";
		document.querySelector('#chessGame').style.display = null
		ChatEl.style.display = null
		document.getElementById('statusPGN').style.display = null
	}


	config.position = fenString
	board = ChessBoard('myBoard', config)
	// console.log(turnt)
	// document.getElementById('pgn').textContent = pgn
})

//To turn off dragging
socket.on('Dragging', id => {
	if (socket.id != id) {
		config.draggable = true;//"white dont drag"		
	} else {
		config.draggable = false;//black dont drag		
	}
})

socket.on('askMoveBack', (color, move, room, currFen) => {
	// console.log("IM", config.orientation[0])


	if (color == config.orientation[0]) {
		if (confirm("Do you want to move back ?")) {
			socket.emit('replyFromMoveBack', true, move, room, currFen)

		} else {
			socket.emit('replyFromMoveBack', false, move, room, currFen) // here currFen not used
		}
	}
	//This is to be done initially only
})

socket.on('cantMoveBack', () => {
	alert("Cant Move back as it leads to Check")
})

//To Update Status Element
socket.on('updateStatus', (turn) => {
	if (board.orientation().includes(turn)) {
		statusEl.textContent = "Your turn"
		resume_clock()
	}
	else {
		statusEl.textContent = "Opponent's turn"
		pause_clock()
	}
})

//If in check
socket.on('inCheck', turn => {
	if (board.orientation().includes(turn)) {
		statusEl.textContent = "You are in Check!!"
	}
	else {
		statusEl.textContent = "Opponent is in Check!!"
	}
})

//If win or draw
socket.on('gameOver', (turn, win) => {
	config.draggable = false;
	if (win) {
		if (board.orientation().includes(turn)) {
			statusEl.textContent = "You lost, better luck next time :)"
		}
		else {
			statusEl.textContent = "Congratulations, you won!!"
		}
	}
	else {
		statusEl.value = 'Game Draw'
	}
})

//Client disconnected in between
socket.on('disconnectedStatus', () => {
	alert('Opponent left the game!!')
	messageEl.textContent = 'Opponent left the game!!'
})

//Receiving a message
socket.on('receiveMessage', (user, message) => {
	var chatContentEl = document.getElementById('chatContent')
	//Create a div element for using bootstrap
	chatContentEl.scrollTop = chatContentEl.scrollHeight;
	var divEl = document.createElement('div')
	if (formEl[0].value == user) {
		divEl.classList.add('myMessage');
		divEl.textContent = message;
	}
	else {
		divEl.classList.add('youMessage');
		divEl.textContent = message;
		document.getElementById('messageTone').play();
	}
	var style = window.getComputedStyle(document.getElementById('chatBox'));
	if (style.display === 'none') {
		document.getElementById('chatBox').style.display = 'block';
	}
	chatContentEl.appendChild(divEl);
	divEl.focus();
	divEl.scrollIntoView();
})
//Rooms List update
socket.on('roomsList', (rooms) => {
	// roomsListEl.innerHTML = null;
	// console.log('Rooms List event triggered!! ',  rooms);
	totalRoomsEl.innerHTML = rooms.length
	var dropRooms = document.getElementById('dropRooms')
	while (dropRooms.firstChild) {
		dropRooms.removeChild(dropRooms.firstChild)
	}
	// added event listener to each room
	rooms.forEach(x => {
		var roomEl = document.createElement('div')
		roomEl.setAttribute('class', 'item')

		roomEl.setAttribute('data-value', x)
		roomEl.textContent = x;
		dropRooms.appendChild(roomEl)
	})
})

socket.on('updateTotalUsers', totalUsers => {
	// console.log('event listened')
	totalPlayersEl.innerHTML = totalUsers;
})

//Message will be sent only after you click the button
sendButtonEl.addEventListener('click', (e) => {
	e.preventDefault()
	var message = document.querySelector('#inputMessage').value
	var user = formEl[0].value
	var room = formEl[1].value
	document.querySelector('#inputMessage').value = ''
	document.querySelector('#inputMessage').focus()
	socket.emit('sendMessage', { user, room, message })
})

//Connect clients only after they click Join
joinButtonEl.addEventListener('click', (e) => {
	e.preventDefault()

	var user = formEl[0].value, room = formEl[1].value

	if (!user || !room) {
		messageEl.textContent = "Input fields can't be empty!"
	}
	else {
		joinButtonEl.setAttribute("disabled", "disabled");
		formEl[0].setAttribute("disabled", "disabled")
		document.querySelector('#roomDropdownP').style.display = 'none';
		formEl[1].setAttribute("disabled", "disabled")
		//Now Let's try to join it in room // If users more than 2 we will 
		socket.emit('joinRoom', { user, room }, (error) => {
			messageEl.textContent = error
			if (alert(error)) {
				window.location.reload()
			}
			else    //to reload even if negative confirmation
				window.location.reload();
		})
		messageEl.textContent = "Waiting for other player to join"
	}
})

// multiPlayerEl.addEventListener('click', (e) => {
// 	e.preventDefault();
// 	document.getElementById('joinFormDiv').style.display = "block";
// 	document.getElementById('gameMode').style.display = "none";
// 	//Server will create a game and clients will play it
// 	//Clients just have to diaplay the game
// 	var board = ChessBoard('myBoard')
// 	config = {
// 		draggable: false,   //Initially
// 		position: 'start',
// 		onDrop: onDrop,
// 		orientation: 'white'
// 	}
// })

function time_remaining(endtime) {
	var t = Date.parse(endtime) - Date.parse(new Date());
	var seconds = Math.floor((t / 1000) % 60);
	var minutes = Math.floor((t / 1000 / 60) % 60);
	var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
	var days = Math.floor(t / (1000 * 60 * 60 * 24));
	return { 'total': t, 'days': days, 'hours': hours, 'minutes': minutes, 'seconds': seconds };
}

function run_clock(id, endtime) {
	var clock = document.getElementById(id);
	function update_clock() {
		var t = time_remaining(endtime);
		clock.innerHTML = t.minutes + ' : ' + t.seconds;
		if (t.total <= 0) { clearInterval(timeinterval); }
	}
	update_clock(); // run function once at first to avoid delay
	timeinterval = setInterval(update_clock, 1000);
}

function pause_clock() {
	if (!paused) {
		paused = true;
		clearInterval(timeinterval); // stop the clock
		time_left = time_remaining(deadline).total; // preserve remaining time
	}
}

function resume_clock() {
	if (paused) {
		paused = false;
		deadline = new Date(Date.parse(new Date()) + time_left);
		run_clock('clck', deadline);
	}
}

//For removing class from all buttons


// Color Buttons
document.getElementById('messageBox').addEventListener('click', e => {
	e.preventDefault();
	var style = window.getComputedStyle(document.getElementById('chatBox'));
	if (style.display === 'none') {
		document.getElementById('chatBox').style.display = 'block';
	} else {
		document.getElementById('chatBox').style.display = 'none';
	}
})
