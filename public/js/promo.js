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


startPlayEl.addEventListener('click', (e) => {
	e.preventDefault();
	document.getElementById('trn').innerHTML = editorGame.turn();

	// clearEditorEl.style.display = null; // changed Here

	if ((editorBoard.fen().match(/k/g) || []).length < 1 && (editorBoard.fen().match(/K/g) || []).length < 1) {
		alert("There must be atleast 2 Kings of both color in the board")
		return
	}
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
	let currentFen = editorBoard.fen();
	// let currentFen = "8/3P3P/8/1k6/8/6K1/1p1p4/8 w - - 0 1";

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

// clearEditorEl.addEventListener('click', (e) => {
// 	e.preventDefault();
// 	configEditor = {
// 		draggable: true,
// 		dropOffBoard: 'trash',
// 		position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
// 		sparePieces: true
// 	}
// 	editorBoard = Chessboard('boardEditor', configEditor);
// })



function onSnapEndEditor(params) {
	if (promoting) return; //if promoting we need to select the piece first

	editorBoard.position(editorGame.fen())

	console.log("here", params)
}

function onDragStartEditor(source, piece, position, orientation) {
	// do not pick up pieces if the editorGame is over
	if (editorGame.game_over()) {
		if (editorGame.in_draw()) {
			alert('Game Draw!!');
		}
		else if (editorGame.in_checkmate())
			if (editorGame.turn() === 'w')
				alert(`Black won the game!!`);
			else
				alert(`White won the game!!`);


		// if (editorTurnt === 1) {
		// 	alert('You won the game!!');
		// } else {
		// 	alert('You lost!!');
		// }
		return false
	}

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

	myAudioEl.play();
	// illegal move
	if (move === null) {
		return 'snapback'
	}

	let currentFen = editorGame.fen()
	if (move != null && 'captured' in move && move.piece != 'p') {

		if (confirm("Do you want to move back ?")) {
			console.log('Move Me to my old position')
			editorGame.load(currentFen)
			editorGame.put({ type: move.piece, color: move.color }, move.from)
			editorGame.remove(move.to)
			if (!editorGame.fen().includes("k")) {
				editorGame.put({ type: 'k', color: 'b' }, move.from)
				console.log(editorGame.fen().includes("k"))
				console.log(editorGame.fen())

			}
			if (!editorGame.fen().includes("K")) {
				editorGame.put({ type: 'k', color: 'w' }, move.from)
				console.log(editorGame.fen().includes("K"))
			}

			let isCheck = null
			if (editorGame.turn() === 'w') {
				isCheck = editorGame.fen().replace('w', 'b')
			}
			if (editorGame.turn() === 'b') {
				isCheck = editorGame.fen().replace('b', 'w')
			}
			let tempG = new Chess()
			console.log("Is valid fen", tempG.load(isCheck))

			if (tempG.in_check()) {
				alert("Cant Move back as it leads to Check")
				editorGame.load(currentFen)
				editorBoard.position(editorGame.fen())
			}
		}
	}

	// illegal move
	editorGame.undo(); //move is ok, now we can go ahead and check for promotion


	// is it a promotion?
	var source_rank = source.substring(2, 1);
	var target_rank = target.substring(2, 1);

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
	}
	else {
		var move = editorGame.move({
			from: source,
			to: target,
			promotion: 'q' // NOTE: always promote to a queen for example simplicity
		})
	}
	if (editorGame.turn() === "b") {
		removeHighlights()
		removeHighlights()
		boardJqry.find('.square-' + source).addClass('highlight-from')
		boardJqry.find('.square-' + target).addClass('highlight-to')
	} else {
		removeHighlights()
		removeHighlights()
		boardJqry.find('.square-' + source).addClass('highlight-from')
		boardJqry.find('.square-' + target).addClass('highlight-to')
		// squareToHighlight = move.to
	}


	// no promotion, go ahead and move

	editorTurnt = 1 - editorTurnt;


	// make random legal move for black
	// window.setTimeout(makeRandomMoveEditor, 250)
}

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

var onDialogClose = function () {
	// console.log(promote_to);
	move_cfg.promotion = promote_to;
	makeMove(editorGame, move_cfg);
};

function getImgSrc(piece) {
	return piece_theme.replace(
		"{piece}",
		editorGame.turn() + piece.toLocaleUpperCase()
	);
}

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

function makeMove(editorGame, cfg) {
	// see if the move is legal
	var move = editorGame.move(cfg);
	// illegal move
	if (move === null) return "snapback";
}

function removeHighlights() {
	boardJqry.find('.' + squareClass)
		.removeClass('highlight-from')
	boardJqry.find('.' + squareClass)
		.removeClass('highlight-to')
}

function onMoveEnd() {
	boardJqry.find('.square-' + squareToHighlight)
		.addClass('highlight-black')
}

window.bd = boardJqry