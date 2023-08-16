const boardEditorEl = document.getElementById('bd');
const startPlayEl = document.getElementById('startPlay');
const arrangeEl = document.getElementById('arrange');
const myAudioEl = document.getElementById('myAudio');
const clearEditorEl = document.getElementById('clearEditor');
// const startEditor = document.getElementById('startEditor');
var editorTurnt = 0;
let play = true;
var configEditor = {};
var editorBoard = null;
var boardJqry = $('#boardEditor')
var editorGame = new Chess()
var fen, editorGame, piece_theme, promote_to, promoting, promotion_dialog;
promotion_dialog = $("#promotion-dialog");
promoting = false;
piece_theme = "img/chesspieces/wikipedia/{piece}.png";
var squareToHighlight = null
var squareClass = 'square-55d63'

let waitForBoom = false
$(function () {
	$("#dialog-4").dialog({
		dialogClass: 'no-close',
		autoOpen: false,
		modal: true,
		buttons: {
			Yes: function () {
				moveBack($(this).data('move'))
				$(this).dialog("close");
				waitForBoom = false
			},
			No: function () {
				$(this).dialog("close");
				waitForBoom = false
				alertCheckMate()
			},
		},
	});
	// css("font-size", "30px");
	$("#opener-4").click(function () {
		$("#dialog-4").dialog("open");
	});
});

startPlayEl.addEventListener('click', (e) => {
	e.preventDefault();
	document.getElementById('trn').innerHTML = editorGame.turn();
	// clearEditorEl.style.display = null; // changed Here
	if ((editorBoard.fen().match(/k/g) || []).length < 1 || (editorBoard.fen().match(/K/g) || []).length < 1) {
		alert("There must be atleast 2 Kings of both color in the board")
		return
	}
	console.log(editorBoard.fen())
	startPlayEl.style.display = "none";
	arrangeEl.style.display = null;
	let clr = 'w'
	if (confirm("Is it White's turn ?")) {
		clr = "w";
	} else {
		clr = "b";
	}
	let currentFen = editorBoard.fen() + ' ' + clr + ' KQkq - 2 3';
	editorGame = new Chess(currentFen)
	configEditor = {
		draggable: true,
		position: editorBoard.fen(),
		onSnapEnd: onSnapEndEditor,
		onDragStart: onDragStartEditor,
		onDrop: onDropEditor,
		onMoveEnd: onMoveEnd,
	}
	editorBoard = Chessboard('boardEditor', configEditor);
	play = true;
})

arrangeEl.addEventListener('click', (e) => {
	e.preventDefault();
	play = false;
	// Get current Fen string and set config
	// document.querySelector('#clearEditor').style.display = null;
	startPlayEl.style.display = null;
	arrangeEl.style.display = "none";
	clearEditorEl.style.display = null;
	//let currentFen = editorBoard.fen();
	let currentFen = editorGame.fen();
	configEditor = {
		draggable: true,
		dropOffBoard: 'trash',
		position: currentFen,
		sparePieces: true
	}
	editorBoard = Chessboard('boardEditor', configEditor);
	$('#clearEditor').on('click', editorBoard.clear)
})

boardEditorEl.addEventListener('click', (e) => {
	e.preventDefault();
	document.getElementById('gameMode').style.display = "none";
	document.querySelector('#boardEditorGame').style.display = null;
	// document.querySelector('#clearEditor').style.display = "none";
	// document.querySelector('#startEditor').style.display = "none";
	configEditor = {
		draggable: true,
		position: 'start',
		onSnapEnd: onSnapEndEditor,
		onDragStart: onDragStartEditor,
		onDrop: onDropEditor,
		onMoveEnd: onMoveEnd,
	}
	editorBoard = Chessboard('boardEditor', configEditor);
})

var validMoves = []
// Board Change Functions
function onSnapEndEditor(params) {
	if (promoting) return; //if promoting we need to select the piece first
	editorBoard.position(editorGame.fen())
}

function onDragStartEditor(source, piece, position, orientation) {
	// CHECK AT END OF ONDROPEDITOR

	// do not pick up pieces if the editorGame is over
	// if (editorGame.game_over()) {
	// 	if (editorGame.in_draw()) {
	// 		alert('Game Draw!!');
	// 	} else if (editorGame.in_checkmate()) {
	// 		console.log('Check Mate')
	// 		// if (sampleCheckMate(flag, piece)) {
	// 		// 	return
	// 		// }
	// 	}
	// 	// return false
	// }
	// only pick up pieces for White
	// if (piece.search(/^b/) !== -1) return false
}

function onDropEditor(source, target) {
	// see if the move is legal
	var move = editorGame.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a queen for example simplicity
	})


	document.getElementById('trn').style.display = null;
	document.getElementById('trn').innerHTML = editorGame.turn();
	let currentFen = editorGame.fen()
	let fun = 0;
	let validMovesOfPieces = editorGame.moves({ verbose: true, legal: false })
	for (let i = 0; i < validMovesOfPieces.length; i++) {
		if (validMovesOfPieces[i].from === source && validMovesOfPieces[i].to === target) {
			console.log(validMovesOfPieces[i].from)
			fun = 1;
			break;
		}
	}
	myAudioEl.play();
	// illegal move
	if (move === null) {
		console.log("Move is null")
		if (editorGame.get(target) && !isCheckAfterRemovePiece(currentFen, target)
			&& fun === 1) {
			moveIllegal(source, target);
		}
		if (editorGame.in_checkmate() || editorGame.in_check()) {
			console.log('Check Mate')
			if (editorGame.get(target) && !isCheckAfterRemovePiece(currentFen, target) && fun === 1) {
				moveIllegal(source, target);
			} else {
				return
			}
		} else {

			console.log('Snap 2');
			return
		}
		return;
	} else {
		changeSquareColorAfterMove(source, target)
	}
	if (move != null && 'captured' in move && move.piece != 'p') {
		waitForBoom = true
		$("#dialog-4").data('move', move).dialog("open");
	}
	editorGame.undo(); //move is ok, now we can go ahead and check for promotion
	// is it a promotion?
	var source_rank = source.substring(2, 1);
	var target_rank = target.substring(2, 1);
	if (source != null) {
		var piece = editorGame.get(source).type;
		if (
			piece === "p" &&
			((source_rank === "7" && target_rank === "8") ||
				(source_rank === "2" && target_rank === "1"))
		) {
			promoting = true;
			// get piece images
			$(".promotion-piece-q").attr("src", getImgSrc("q"));
			$(".promotion-piece-r").attr("src", getImgSrc("r"));
			$(".promotion-piece-n").attr("src", getImgSrc("n"));
			$(".promotion-piece-b").attr("src", getImgSrc("b"));
			//show the select piece to promote to dialog
			promotion_dialog
				.dialog({
					modal: true,
					height: 52,
					width: 184,
					resizable: true,
					draggable: false,
					close: () => {
						move.promotion = promote_to
						editorGame.move(move)
					},
					closeOnEscape: false,
					dialogClass: "noTitleStuff",
				})
				.dialog("widget")
				.position({
					of: $("#boardEditorGame"),
					my: "middle middle",
					at: "middle middle",
				});
			//the actual move is made after the piece to promote to
			//has been selected, in the stop event of the promotion piece selectable
			return;
		} else {
			var move = editorGame.move({
				from: source,
				to: target,
				promotion: 'q' // NOTE: always promote to a queen for example simplicity
			})
		}

		// squareToHighlight = move.to
		editorTurnt = 1 - editorTurnt;
		// make random legal move for black
		// window.setTimeout(makeRandomMoveEditor, 250)

	}
	if (!waitForBoom) alertCheckMate()
}

function alertCheckMate() {
	if (editorGame.in_checkmate() && isBoomCheckMate(editorGame.fen())) {
		if (editorGame.turn() === 'w')
			alert('Black Wins')
		if (editorGame.turn() === 'b')
			alert('White Wins')
		return
	}
}

function onMoveEnd() {
	boardJqry.find('.square-' + squareToHighlight)
		.addClass('highlight-black')
}

// Action/Moving Functions
$("#promote-to").selectable({
	stop: function () {
		$(".ui-selected", this).each(function () {
			var selectable = $("#promote-to li");
			var index = selectable.index(this);
			if (index > -1) {
				var promote_to_html = selectable[index].innerHTML;
				var span = $("<div>" + promote_to_html + "</div>").find("span");
				promote_to = span[0].innerHTML;
			}
			promotion_dialog.dialog("close");
			$(".ui-selectee").removeClass("ui-selected");
			editorBoard.position(editorGame.fen(), false);
			// showSideToMove();
			promoting = false;
		});
	},
});

function moveBack(move) {
	let currentFen = editorGame.fen()
	console.log('Move Me to my old position')
	editorGame.load(currentFen)
	editorGame.put({
		type: move.piece,
		color: move.color
	}, move.from)
	editorGame.remove(move.to)
	if (!editorGame.fen().includes("k")) {
		editorGame.put({
			type: 'k',
			color: 'b'
		}, move.from)
	}
	if (!editorGame.fen().includes("K")) {
		editorGame.put({
			type: 'k',
			color: 'w'
		}, move.from)
	}
	editorBoard.position(editorGame.fen())
	let isCheck = null
	let eg = editorGame.fen()
	if (editorGame.turn() === 'w') {
		let myArray = eg.split(" ");
		myArray[1] = "b";
		isCheck = myArray.join(" ");
	}
	if (editorGame.turn() === 'b') {
		let myArray = eg.split(" ");
		myArray[1] = "w";
		isCheck = myArray.join(" ");
	}
	let tempG = new Chess()
	console.log("Is valid fen", tempG.load(isCheck))
	if (tempG.in_check()) {
		editorGame.load(currentFen)
		editorBoard.position(editorGame.fen())
		return {
			s: -1,
			m: "Cant Move back as it leads to Check"
		}
	}
	editorTurnt = 1 - editorTurnt;
	alertCheckMate()
	waitForBoom = false
	return {
		s: 1,
		m: "Moved Back"
	}

}

function moveIllegal(source, target) {
	if (!editorGame.get(target)) return
	let currentFen = editorGame.fen()
	console.log(source, target)
	var custommove = editorGame.get(source);
	editorGame.load(currentFen)
	console.log(editorGame.put({ type: custommove.type, color: custommove.color }, target))
	editorGame.remove(target)
	let isCheck = null
	let eg = editorGame.fen()
	console.log(editorGame.fen())
	console.log(editorGame.in_check())

	if (editorGame.turn() === 'w') {
		let myArray = eg.split(" ");
		myArray[1] = "b";
		isCheck = myArray.join(" ");
	}
	if (editorGame.turn() === 'b') {
		let myArray = eg.split(" ");
		myArray[1] = "w";
		isCheck = myArray.join(" ");
	}
	console.log("Load Check")
	editorGame.load(isCheck)
	console.log(editorGame.in_check())
	console.log(editorGame.fen())
	editorBoard.position(isCheck, false);

	changeSquareColorAfterMove(source, target)
}

function changeSquareColorAfterMove(source, target) {
	boardJqry.find('.' + squareClass)
		.removeClass('highlight-from')
	boardJqry.find('.' + squareClass)
		.removeClass('highlight-to')
	boardJqry.find('.square-' + source).addClass('highlight-from')
	boardJqry.find('.square-' + target).addClass('highlight-to')
}

//Checking Functions
function isCheckAfterRemovePiece(fen, square) {
	// we see isCheck for turn
	let c = new Chess()
	c.load(fen)
	c.remove(square)
	return c.in_check() // If in Check dont allow to cut, remove from valid moves
}

function isBoomCheckMate(fen) {
	let c = new Chess()
	c.load(fen)

	// console.log(c.moves({ verbose: true, legal: false }))
	let f = 0
	let mvs = c.moves({ verbose: true, legal: false })
	for (let i = 0; i < mvs.length; i++) {
		const mv = mvs[i];
		console.log(mv.flags)

		if (mv.flags === 'c' && !isCheckAfterRemovePiece(fen, mv.to)) {
			console.log(mv) // ! DO NOT DLT. Keep This Console Log for moves
			f++;
		}
	}
	return (!f > 0)
}

function isCheckForAlterTurnAftermove(fen, source, target) {
	let isCheckGame = new Chess()
	console.log(fen, source, target)
	let myArray = fen.split(" ");
	if (myArray[1] == "b")
		myArray[1] = "w";
	else
		myArray[1] = "b";
	fen = myArray.join(" ");
	isCheckGame.load(fen)
	let sourcePiece = isCheckGame.get(source)
	isCheckGame.load(fen)
	isCheckGame.remove(source)
	isCheckGame.put({
		type: sourcePiece.type,
		color: sourcePiece.color
	}, target)
	return isCheckGame.in_check()
}

function isCheckForTurnAftermove(fen, source, target) {
	let isCheckGame = new Chess()
	console.log(fen, source, target)
	isCheckGame.load(fen)
	let sourcePiece = isCheckGame.get(source)
	isCheckGame.remove(source)
	isCheckGame.put({
		type: sourcePiece.type,
		color: sourcePiece.color
	}, target)
	return isCheckGame.in_check()
}

// Misc Functions
function makeRandomMoveEditor() {
	var possibleMoves = editorGame.moves()
	// editorGame over
	if (possibleMoves.length === 0) {
		return;
	}
	var randomIdx = Math.floor(Math.random() * possibleMoves.length)
	editorGame.move(possibleMoves[randomIdx]);
	myAudioEl.play();
	editorTurnt = 1 - editorTurnt;
	editorBoard.position(editorGame.fen());
}

function getImgSrc(piece) {
	return piece_theme.replace(
		"{piece}",
		editorGame.turn() + piece.toLocaleUpperCase()
	);
}

// function noOfKingNeighbours(source) {
// 	var flag = 0;
// 	let cust = source;
// 	let a = cust.charCodeAt(0);
// 	let b = cust.charAt(1);
// 	let currentFen = editorGame.fen()
// 	validMoves = validMovesKing(a, b)
// 	for (let i = 0; i < validMoves.length - 1; i++) {
// 		if (editorGame.get(validMoves[i]) != null) {
// 			if (editorGame.get(validMoves[i]).color != editorGame.turn()) {
// 				if (isCheckAfterRemovePiece(currentFen, validMoves[i])) {
// 					let index = validMoves.indexOf(validMoves[i])
// 					validMoves.splice(index, 1)
// 				} else {
// 					flag++
// 				}
// 			}
// 		}
// 	}

// 	return flag;
// }

// function sampleCheckMate(flag, piece) {
// 	if (flag > 0 && piece.charAt(0) == editorGame.turn()) {
// 		if (piece === 'bK' || piece == 'wK') {
// 			console.log("King")
// 			flag = 0;
// 			return 1
// 		} else {
// 			console.log('I am Here')
// 			flag = 0;
// 			return 0
// 		}
// 	} else {
// 		if (piece.charAt(1) == 'K' && piece.charAt(0) == editorGame.turn()) {
// 			if (editorGame.turn() === 'w') {
// 				alert('Black Win!!')
// 				editorGame.load(currentFen);
// 				return
// 			} else {
// 				alert('White Won!!')
// 				editorGame.load(currentFen);
// 				return
// 			}
// 		} else if (piece.charAt(1) != 'K') {
// 			return 0;
// 		} else {
// 			console.log("Helloo")
// 		}
// 	}
// }
// function validMovesKing(a, b) {
// 	let alpha = a;
// 	let num = parseInt(b);
// 	var movesKing = []
// 	movesKing[0] = String.fromCharCode((alpha)).concat(num - 1);
// 	movesKing[1] = String.fromCharCode((alpha - 1)).concat(num - 1);
// 	movesKing[2] = String.fromCharCode((alpha + 1)).concat(num - 1);
// 	movesKing[3] = String.fromCharCode((alpha)).concat(num + 1);
// 	movesKing[4] = String.fromCharCode((alpha - 1)).concat(num + 1);
// 	movesKing[5] = String.fromCharCode((alpha + 1)).concat(num + 1);
// 	movesKing[6] = String.fromCharCode((alpha - 1)).concat(num);
// 	movesKing[7] = String.fromCharCode((alpha + 1)).concat(num);
// 	return movesKing
// }



window.bd = boardJqry
window.editorGame = editorGame
