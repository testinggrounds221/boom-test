socket.on('Dropped', ({ source, target, room }) => {
	var game = gameData[socket.id]

	var move = game.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a queen for example simplicity
	})
	// console.log(move)
	let currentFen = game.fen()

	// If correct move, then toggle the turns
	if (move != null && 'captured' in move && move.piece != 'p') {
		console.log("Do you want to go back to ", source, " ?")
		io.to(room).emit('DisplayBoard', game.fen(), undefined)
		io.to(room).emit('askMoveBack', move.color, move, room, currentFen)

	} else {
		if (move != null) {
			io.to(room).emit('Dragging', socket.id)
		}
		io.to(room).emit('DisplayBoard', game.fen(), undefined)
		updateStatus(game, room)
	}
	// old
	// new

	let fun = 0;
	let validMovesOfPieces = game.moves({ verbose: true, legal: false })
	for (let i = 0; i < validMovesOfPieces.length; i++) {
		if (validMovesOfPieces[i].from === source && validMovesOfPieces[i].to === target) {
			console.log(validMovesOfPieces[i].from)
			fun = 1;
			break;
		}
	}

	// illegal move
	if (move === null) {
		console.log("Move is null")
		if (game.get(target) && !isCheckAfterRemovePiece(currentFen, target)
			&& fun === 1) {
			moveIllegal(source, target);
		}
		if (game.in_checkmate() || game.in_check()) {
			console.log('Check Mate')
			if (game.get(target) && !isCheckAfterRemovePiece(currentFen, target) && fun === 1) {
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
		// emit change color event
	}
	if (move != null && 'captured' in move && move.piece != 'p') {
		waitForBoom = true
		// emit Ask Move Back
		$("#dialog-4").data('move', move).dialog("open");
	}
	game.undo(); //move is ok, now we can go ahead and check for promotion
	// is it a promotion?
	var source_rank = source.substring(2, 1);
	var target_rank = target.substring(2, 1);
	if (source != null) {
		var piece = game.get(source).type;
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
			// TODO: sssc
			promotion_dialog
				.dialog({
					modal: true,
					height: 52,
					width: 184,
					resizable: true,
					draggable: false,
					close: () => {
						move.promotion = promote_to
						game.move(move)
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
			var move = game.move({
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

})


function isCheckAfterRemovePiece(fen, square) {
	// we see isCheck for turn
	let c = new Chess()
	c.load(fen)
	c.remove(square)
	return c.in_check() // If in Check dont allow to cut, remove from valid moves
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


// To implement in client:
// changeSquareColorAfterMove(source, target)
// alertCheckMate()
// dialog box for pwan promotion