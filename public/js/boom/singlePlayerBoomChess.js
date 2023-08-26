// TODO : BOard Refreshes to new state after loading
const whiteColor = document.getElementById('white');
const blackColor = document.getElementById('black');
const saveGame = document.getElementById('saveGame');
const savePGN = document.getElementById('savePGN');
const myAudioEl = document.getElementById('myAudio');


// const startEditor = document.getElementById('startEditor');
var editorTurnt = 0;
let play = true;
var configEditor = {};
var editorBoard = null;
var boardJqry = $('#boardEditor')
let org = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'
let tc1 = 'rnbq1k1r/pppB1ppp/5n2/8/4Q3/8/PPPPPPPP/RNB1K1NR w - - 0 1'
let tc2 = 'rnbqkbnr/ppp1pppp/8/3p3Q/8/3K4/PPPPPPPP/RNB2BNR w - - 0 1'
let tc3 = 'r3k2r/p1pp1ppp/bpnbpq1n/8/3Q4/N3BNPB/PPP1PP1P/R3K2R w KQkq - 0 1'
var editorGame;
var fen, piece_theme, promote_to, promoting, promotion_dialog;
promotion_dialog = $("#promotion-dialog");
promoting = false;
piece_theme = "img/chesspieces/wikipedia/{piece}.png";
var squareToHighlight = null
var squareClass = 'square-55d63'
let currentSource = null

let currentSAN = null

let isBoomAllowed = true
let playWithComp = true
let loadGame = true

let loadGameFen = null
let isChangeFen = false
let changeFen = {} // Used to load Previous Configuration of same game
setBoomAllowed()
setPlayWithComp()
setLoadGame()

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
				currentSAN += "<"
				makeRandomMoveEditor()
			},
			No: function () {
				$(this).dialog("close");
				waitForBoom = false
				alertCheckMate()
				makeRandomMoveEditor()

			},
		},
	});
	// css("font-size", "30px");
	$("#opener-4").click(function () {
		$("#dialog-4").dialog("open");
	});
});

function setupGameBoard(orientation) {
	document.getElementById('gameMode').style.display = "none";
	document.getElementById('saveGame').style.display = null;
	document.getElementById('savePGN').style.display = null;
	document.getElementById('moveTable').style.display = null;
	document.querySelector('#boardEditorGame').style.display = null;

	configEditor = {
		draggable: true,
		position: 'start',
		onSnapEnd: onSnapEndEditor,
		onDragStart: onDragStartEditor,
		onDrop: onDropEditor,
		onMoveEnd: onMoveEnd,
		orientation: orientation
	}
	editorGame = new Chess()
	if (loadGame && loadGameFen) {
		configEditor = { ...configEditor, position: loadGameFen };
		editorGame.load(loadGameFen)
	}
	editorBoard = Chessboard('boardEditor', configEditor);
	addEventListeners()
	if (orientation === 'black' && editorGame.turn() == 'w') makeRandomMoveEditor()
	if (orientation === 'white' && editorGame.turn() == 'b') makeRandomMoveEditor()
}

whiteColor.addEventListener('click', (e) => {
	e.preventDefault();
	setupGameBoard('white')
})

blackColor.addEventListener('click', (e) => {
	e.preventDefault();
	setupGameBoard('black')

})

saveGame.addEventListener('click', saveGameListener)
savePGN.addEventListener('click', savePGNListener)
var validMoves = []
// Board Change Functions
function onSnapEndEditor(params) {
	if (promoting) return; //if promoting we need to select the piece first
	editorBoard.position(editorGame.fen())
}

function onDragStartEditor(source, piece, position, orientation) {
	return false
	if (!isBoomAllowed) {
		if (handleNormalCheckMate()) return false
	}
}

function onDropEditor(source, target) {
	if (source === target)
		return onClickSquare(source)
	currentSource = null
	// see if the move is legal
	if (isChangeFen) setBoardAndGame(changeFen)
	var move = editorGame.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a queen for example simplicity
	})

	if (move) currentSAN = move["san"]
	console.log(currentSAN)

	document.getElementById('trn').style.display = null;
	document.getElementById('trn').innerHTML = editorGame.turn();
	let currentFen = editorGame.fen()
	let fun = 0;
	let validMovesOfPieces = editorGame.moves({ verbose: true, legal: false })
	for (let i = 0; i < validMovesOfPieces.length; i++) {
		if (validMovesOfPieces[i].from === source && validMovesOfPieces[i].to === target) {
			fun = 1;
			break;
		}
	}
	// myAudioEl.play();
	// illegal move
	if (move === null && isBoomAllowed) {
		console.log("Move is null")
		if (editorGame.get(target) && !isCheckAfterRemovePiece(currentFen, target)
			&& fun === 1) {
			currentSAN = getSAN(source, target)
			moveIllegal(source, target);
			makeRandomMoveEditor()
		}
		else if (editorGame.in_checkmate() || editorGame.in_check()) {
			console.log('Check Mate')
			if (editorGame.get(target) && !isCheckAfterRemovePiece(currentFen, target) && fun === 1) {
				currentSAN = getSAN(source, target)
				moveIllegal(source, target);
				makeRandomMoveEditor()
			} else {
				return
			}
		} else {
			console.log('Snap 2');
			return
		}
		return;
	} else {
		if (move === null) { handleNormalCheckMate(); return }
		// changeSquareColorAfterMove(source, target)
	}
	if (move != null && 'captured' in move && move.piece != 'p') {
		waitForBoom = true
		editorGame.undo();
		if (!isCheckAfterRemovePiece(editorGame.fen(), move.to) && isBoomAllowed) {
			var move = editorGame.move({
				from: source,
				to: target,
				promotion: 'q'
			})
			$("#dialog-4").data('move', move).dialog("open");
		} else {
			currentSAN = getSAN(source, target)
			var move = editorGame.move({
				from: source,
				to: target,
				promotion: 'q'
			})
		}
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
						let promoMove = editorGame.move(move)
						if (promoMove) currentSAN = move["san"]
						handleNormalCheckMate()
						makeRandomMoveEditor()
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
	if (!waitForBoom && isBoomAllowed) {
		alertCheckMate()
		makeRandomMoveEditor()
	} else if (!isBoomAllowed) handleNormalCheckMate()
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

function getSAN(source, target) {
	if (editorGame.get(target)) editorGame.get(source).type.toUpperCase() + "x" + target
	return editorGame.get(source).type.toUpperCase() + target
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
	var custommove = editorGame.get(source);
	editorGame.load(currentFen)
	editorGame.put({ type: custommove.type, color: custommove.color }, target)
	editorGame.remove(target)

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
	editorGame.load(isCheck)
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

//Move Table Functions
function addMove(moveFen) {
	let moveTable = null
	const currTurn = editorGame.turn()
	if (currTurn === 'b')
		moveTable = document.getElementById("whiteMoves")
	else moveTable = document.getElementById("blackMoves")

	let tr = document.createElement("tr")
	let td = document.createElement("td")
	const rowNum = moveTable.rows.length
	// td.innerText = `Move ${rowNum + 1}`
	td.innerText = currentSAN
	currentSAN = null
	td.addEventListener('click', () => { previewFen(moveFen, rowNum, currTurn) })
	td.style = "cursor:pointer"
	tr.appendChild(td)
	tr.id = `m${currTurn}-${rowNum}`
	moveTable.appendChild(tr)
}

function previewFen(moveFen, rowNum, turn) {
	editorGame.load(moveFen)
	editorBoard.position(moveFen)
	changeFen = { moveFen, rowNum, turn }
	isChangeFen = true
}

function setBoardAndGame({ moveFen, rowNum, turn }) {
	isChangeFen = false
	editorGame.load(moveFen)
	editorBoard.position(moveFen)
	const whiteTable = document.getElementById("whiteMoves")
	const blackTable = document.getElementById("blackMoves")

	const maxLenW = whiteTable.rows.length
	if (turn === 'w') rowNum++
	for (let i = rowNum; i < maxLenW; i++) {
		if (document.getElementById(`mw-${i}`))
			document.getElementById(`mw-${i}`).remove()
		if (document.getElementById(`mb-${i}`))
			document.getElementById(`mb-${i}`).remove()
	}

	// const maxLenB = blackTable.rows.length
	// for (let i = rowNum + 1; i < maxLenB; i++) {
	// 	document.getElementById(`m${turn}-${i}`).remove()
	// }
	if (playWithComp) if (editorGame.turn() === 'b') makeRandomMoveEditor()
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
		if (mv.flags === 'c' && !isCheckAfterRemovePiece(fen, mv.to)) {
			// console.log(mv) // ! DO NOT DLT. Keep This Console Log for moves
			f++;
		}
	}
	return (!f > 0)
}

function isCheckForAlterTurnAftermove(fen, source, target) {
	let isCheckGame = new Chess()
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
	isCheckGame.load(fen)
	let sourcePiece = isCheckGame.get(source)
	isCheckGame.remove(source)
	isCheckGame.put({
		type: sourcePiece.type,
		color: sourcePiece.color
	}, target)
	return isCheckGame.in_check()
}

function makeRandomMoveEditor() {
	editorBoard.position(editorGame.fen())
	addMove(editorGame.fen())
	if (playWithComp) {
		setTimeout(() => { makeRandomMove(); addMove(editorGame.fen()) }, 500);

	}
}

// Misc Functions
function saveGameListener(e) {
	e.preventDefault();
	var copyText = editorGame.fen();
	// navigator.clipboard.writeText(copyText);
	// alert("Copied the FEN : " + copyText + " to clipboard");
	downloadFile("fen.txt", copyText)
}

function savePGNListener(e) {
	e.preventDefault();
	let wt = document.getElementById("whiteMoves")
	let bt = document.getElementById("blackMoves")

	let wr = wt.rows
	let br = bt.rows

	let wc = wr.length
	let bc = br.length

	let pgnString = ""
	for (let wp = 0, bp = 0; wp < wc, bp < bc; wp++, bp++) {
		let w = wr[wp].children[0].innerText
		let b = br[bp].children[0].innerText
		pgnString += (wp + 1 + ". " + w + " " + b + " ")
	}
	pgnString = pgnString.trim()
	// navigator.clipboard.writeText(pgnString);
	// alert("Copied the PGN : " + pgnString + " to clipboard")
	downloadFile("pgn.txt", pgnString)
}

function makeRandomMove() {
	var possibleMoves = editorGame.moves()
	// editorGame over
	if (possibleMoves.length === 0) {
		return;
	}
	var randomIdx = Math.floor(Math.random() * possibleMoves.length)
	let move = editorGame.move(possibleMoves[randomIdx]);
	currentSAN = move['san']
	// myAudioEl.play();
	editorTurnt = 1 - editorTurnt;
	editorBoard.position(editorGame.fen());
	setTimeout(changeSquareColorAfterMove(move.from, move.to), 500)

}

function getImgSrc(piece) {
	return piece_theme.replace(
		"{piece}",
		editorGame.turn() + piece.toLocaleUpperCase()
	);
}

function setBoomAllowed() {
	const urlParams = new URLSearchParams(window.location.search);
	if (!urlParams.get('isBoomAllowed')) console.error("NO BOOM Instructions")
	if (urlParams.get('isBoomAllowed') === 'false') isBoomAllowed = false
	else isBoomAllowed = true
}

function setPlayWithComp() {
	const urlParams = new URLSearchParams(window.location.search);
	if (!urlParams.get('playWithComp')) { console.error("NO playWithComp Instructions"); }
	if (urlParams.get('playWithComp') === 'false') playWithComp = false
	else playWithComp = true
}

function setLoadGame() {
	const urlParams = new URLSearchParams(window.location.search);
	if (!urlParams.get('loadGame')) { console.error("NO Load Game Instructions"); loadGame = false; return }
	if (urlParams.get('loadGame') === 'false') loadGame = false
	else {
		loadGame = true
		switch (urlParams.get('loadGameType')) {
			case "fen":
				setFENGame()
				break;
			case "san":
				setSANGame()
				break;
			case "none":
				console.error("Load Game true but no config (none)")
				break;
			default:
				console.error("Load Game true but no config")
				break;
		}
	}
}

function setSANGame() {
	let pgn = sessionStorage.getItem("pgn");
	sessionStorage.clear();
	let loadPGNGame = new Chess()
	let sp = pgn.split(" ")
	try {
		for (let i = 0; i < sp.length; i++) {
			if (i % 3 == 0) continue
			else {
				let currentPgn = sp[i]
				if (sp[i].includes("<")) {
					sp[i] = sp[i].replace("<", "")
					let c = new Chess(loadPGNGame.fen())
					let m = c.move(sp[i], { "verbose": true })
					c.put({ type: m.piece, color: m.color }, m.from)
					c.remove(m.to)
					loadPGNGame.load(c.fen())
				} else {
					loadPGNGame.move(sp[i])
				}
				addMoveFromSAN(loadPGNGame.fen(), loadPGNGame.turn(), currentPgn)
			}
		}
		console.log(loadPGNGame.fen())
		loadGameFen = loadPGNGame.fen()
		// alert("Loaded Game! Choose Color");
	} catch (error) {
		alert("Enter Valid PGN")
	}


}

function addMoveFromSAN(moveFen, currCustomTurn, currentCustomPgn) {
	let moveTable = null
	if (currCustomTurn === 'b')
		moveTable = document.getElementById("whiteMoves")
	else moveTable = document.getElementById("blackMoves")

	let tr = document.createElement("tr")
	let td = document.createElement("td")
	const rowNum = moveTable.rows.length
	// td.innerText = `Move ${rowNum + 1}`
	td.innerText = currentCustomPgn
	// td.addEventListener('click', () => { previewFen(moveFen, rowNum, currCustomTurn) })
	td.style = "cursor:pointer"
	tr.appendChild(td)
	tr.id = `m${currCustomTurn}-${rowNum}`
	moveTable.appendChild(tr)
}

function setFENGame() {
	let cusFen = sessionStorage.getItem("fen");
	sessionStorage.clear();
	var temp = new Chess()
	if (cusFen && !temp.load(cusFen)) { alert("Enter Valid State !"); return }
	loadGameFen = cusFen
	// alert("Loaded Game! Choose Color");
}

function handleNormalCheckMate() {
	if (editorGame.game_over()) {
		if (editorGame.in_draw()) {
			alert('Game Draw!!');
		} else if (editorGame.in_checkmate()) {
			if (editorGame.turn() === 'w')
				alert('Black Wins')
			if (editorGame.turn() === 'b')
				alert('White Wins')
		}
		return true
	}
}

function addEventListeners() {
	// boardJqry.find('.square-' + sq).bind('click',)
	editorGame.SQUARES.forEach(
		(sq) => boardJqry.find('.square-' + sq).bind('click',
			() => {
				onClickSquare(sq)
			}
		))
}

function currHighlight(sq) {
	boardJqry.find('.square-' + sq).addClass('highlight-curr')
}

function removeCurrHighlight() {
	boardJqry.find('.' + squareClass).removeClass('highlight-curr')
}

function onClickSquare(sq) {
	if (currentSource === null) {
		if (editorGame.get(sq) === null) return
		if (editorBoard.orientation().startsWith(editorGame.get(sq).color)) {
			currentSource = sq
			currHighlight(sq)
			return
		}
	}
	else {
		if (editorGame.get(sq) === null) { // handle for not allowed Square
			onDropEditor(currentSource, sq)
			removeCurrHighlight()
			currentSource = null // redundant but for logic purp
			return
		}
		// if (editorGame.get(sq) !== null) { // handle for not allowed Square
		// 	ondrop(currentSource, sq)
		// 	currentSource = null
		// 	return
		// }
		if (editorGame.get(sq).color === editorGame.get(currentSource).color) {
			currentSource = null
			removeCurrHighlight()
			return
		}

		if (editorGame.get(sq).color !== editorGame.get(currentSource).color) {
			onDropEditor(currentSource, sq)
			currentSource = null
			removeCurrHighlight()
			return
		}
	}
}

// File Handling Operarions
function downloadFile(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}

