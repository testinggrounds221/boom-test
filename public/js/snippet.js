let currFen = editorGame.fen()
let tG = new Chess()

tG.load(currFen)
tG.put({
	type: move.piece,
	color: move.color
}, move.from)
tG.remove(move.to)
if (!tG.fen().includes("k")) {
	tG.put({
		type: 'k',
		color: 'b'
	}, move.from)
}
if (!tG.fen().includes("K")) {

	tG.put({
		type: 'k',
		color: 'w'
	}, move.from)
}
let isCheck = null
let eg = tG.fen()
if (tG.turn() === 'w') {
	let myArray = eg.split(" ");
	myArray[1] = "b";
	isCheck = myArray.join(" ");
}
if (tG.turn() === 'b') {
	let myArray = eg.split(" ");
	myArray[1] = "w";
	isCheck = myArray.join(" ");
}

console.log("Is valid fen", tG.load(isCheck))

return tG.in_check()