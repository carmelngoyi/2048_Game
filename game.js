let isMusicMuted = false; 
let gameStarted = false; 

var board;
var score = 0;
var rows = 4; 
var columns = 4; 
let previousBoards = [];
let undoCount = 0;
const max_undo = 5;

// Sound
const backgroundMusic = new Audio("game-music-loop-6-144641.mp3"); // Background music
const slideSound = new Audio("swipe-132084.mp3");  // Short sound for tile slides (placeholder)
const mergeSound = new Audio("merge.mp3");  // merge sound

window.onload = function() {
    // Initialize music state from localStorage
    const savedMuteState = localStorage.getItem('isMusicMuted');
    if (savedMuteState === 'true') {
        isMusicMuted = true;
        
        // Manually update the icon since startGame isn't called yet
        const muteIcon = document.getElementById("mute-icon");
        if (muteIcon) {
            muteIcon.classList.remove("fa-volume-high");
            muteIcon.classList.add("fa-volume-xmark");
        }
    }

    loadHighScore();
};

// Function to toggle background music mute state
function toggleMusic() {
    isMusicMuted = !isMusicMuted;
    backgroundMusic.muted = isMusicMuted;
    
    const muteIcon = document.getElementById("mute-icon");
    
    if (isMusicMuted) {
        // Change icon to mute
        muteIcon.classList.remove("fa-volume-high");
        muteIcon.classList.add("fa-volume-xmark");
        backgroundMusic.pause(); // Stop playing if muted (optional but good practice)
    } else {
        // Change icon to unmute
        muteIcon.classList.remove("fa-volume-xmark");
        muteIcon.classList.add("fa-volume-high");
        
        // Try to play the music again, which should only work if it was muted
        // and the gameStarted flag is not yet true (since backgroundMusic.play() is in startGame)
        if (!gameStarted) {
            playBackgroundMusic(); 
        } else {
            backgroundMusic.play().catch(error => console.error("Could not resume music:", error));
        }
    }
    // Store the preference
    localStorage.setItem('isMusicMuted', isMusicMuted);
}

// --- NEW FUNCTIONS FOR SPLASH SCREEN ---

function startGame() {
    gameStarted = true;
    playBackgroundMusic(); // Start the background music
    // Hide splash screen
    document.getElementById("splash-screen").classList.add("hidden");
    // Show game container
    document.getElementById("game-container").classList.remove("hidden");
    // Initialize the game
    setGame();
}


function setGame() {
    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];

    document.getElementById("board").innerHTML = "";
    score = 0;
    undoCount = 0;
    previousBoards = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let tile = document.createElement("div");
            tile.id = r.toString() + "-" + c.toString();
            let num = board[r][c];
            updateTile(tile, num);
            document.getElementById("board").append(tile);
        }
    }

    setTwo();
    setTwo();
    updateScore();
}

function updateTile(tile, num) {
    tile.innerText = "";
    tile.classList.value = ""; 
    tile.classList.add("tile");

    if (num > 0) {
        tile.innerText = num;
        if (num <= 4096) {
            tile.classList.add("x" + num.toString());
        } else {
            tile.classList.add("x8192");
        }
    }
}

function hasEmptyTile() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (board[r][c] == 0) {
                return true;
            }
        }
    }
    return false;
}

function setTwo() {
    if (!hasEmptyTile()) return;

    let found = false;
    while (!found) {
        let r = Math.floor(Math.random() * rows);
        let c = Math.floor(Math.random() * columns);
        if (board[r][c] == 0) {
            board[r][c] = 2;
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            tile.innerText = "2";
            tile.classList.add("x2");
            found = true; 
        }
    }
}

document.addEventListener("keyup", (e) => {
    // Check if the game container is visible before processing moves
    if (document.getElementById("game-container").classList.contains("hidden")) {
        return;
    }
    
    if (e.code == "ArrowLeft") {
        slideLeft();
    } else if (e.code == "ArrowRight") {
        slideRight();
    } else if (e.code == "ArrowUp") {
        slideUp();
    } else if (e.code == "ArrowDown") {
        slideDown();
    }
});

function filterZero(row) {
    return row.filter(num => num != 0);
}

function slide(row) {
    row = filterZero(row);
    for (let i = 0; i < row.length - 1; i++) {
        if (row[i] == row[i + 1]) {
            row[i] *= 2;
            row[i + 1] = 0;
            score += row[i];
            mergeSound.currentTime = 0;
            mergeSound.play();
        }
    }
    row = filterZero(row);
    while (row.length < columns) {
        row.push(0);
    }
    return row;
}

function saveState() {
    previousBoards.push(JSON.parse(JSON.stringify(board)));
    if (previousBoards.length > max_undo) previousBoards.shift();
}

function slideLeft() {
    saveState();
    let moved = false;
    for (let r = 0; r < rows; r++) {
        let row = board[r];
        let newRow = slide(row);
        if (JSON.stringify(row) !== JSON.stringify(newRow)) moved = true;
        board[r] = newRow;
        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            updateTile(tile, board[r][c]);
        }
    }
    if (moved) {
        setTwo();
        playSlideSound();
        updateScore();
        checkGameOver();
    }
}

function slideRight() {
    saveState();
    let moved = false;
    for (let r = 0; r < rows; r++) {
        let row = board[r];
        row.reverse();
        let newRow = slide(row);
        newRow.reverse();
        if (JSON.stringify(board[r]) !== JSON.stringify(newRow)) moved = true;
        board[r] = newRow;

        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            updateTile(tile, board[r][c]);
        }
    }
    if (moved) {
        setTwo();
        playSlideSound();
        updateScore();
        checkGameOver();
    }
}

function slideUp() {
    saveState();
    let moved = false;
    for (let c = 0; c < columns; c++) {
        let row = [board[0][c], board[1][c], board[2][c], board[3][c]];
        let newRow = slide(row);
        for (let r = 0; r < rows; r++) {
            if (board[r][c] !== newRow[r]) moved = true;
            board[r][c] = newRow[r];
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            updateTile(tile, board[r][c]);
        }
    }
    if (moved) {
        setTwo();
        playSlideSound();
        updateScore();
        checkGameOver();
    }
}

function slideDown() {
    saveState();
    let moved = false;
    for (let c = 0; c < columns; c++) {
        let row = [board[0][c], board[1][c], board[2][c], board[3][c]];
        row.reverse();
        let newRow = slide(row);
        newRow.reverse();
        for (let r = 0; r < rows; r++) {
            if (board[r][c] !== newRow[r]) moved = true;
            board[r][c] = newRow[r];
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            updateTile(tile, board[r][c]);
        }
    }
    if (moved) {
        setTwo();
        playSlideSound();
        updateScore();
        checkGameOver();
    }
}

function undoMove() {
    if (undoCount >= max_undo || previousBoards.length === 0) {
        alert("Undo limit reached!");
        return;
    }
    board = previousBoards.pop();
    undoCount++;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(`${r}-${c}`);
            updateTile(tile, board[r][c]);
        }
    }
}

function restartGame() {
    // This is called from the game over screen, which also calls hideGameOverScreen()
    setGame();
}

function updateScore() {
    document.getElementById("score").innerText = score;
    updateHighScore();
}

function updateHighScore() {
    let highScore = localStorage.getItem("highScore") || 0;
    if (score > highScore) {
        localStorage.setItem("highScore", score);
    }
    document.getElementById("highScore").innerText = localStorage.getItem("highScore");
}

function loadHighScore() {
    let highScore = localStorage.getItem("highScore") || 0;
    document.getElementById("highScore").innerText = highScore;
}

// Game Over
function checkGameOver() {
    if (isGameOver()) {
        setTimeout(() => showGameOverScreen(), 1000);
    }
}

function isGameOver() {
    if (hasEmptyTile()) {
        console.log("Game not over: Has empty tiles");
        return false;
    }

    // This looks for possible horizontal merges
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 1; c++) {
            if (board[r][c] === board[r][c + 1]) {
                console.log("Game not over: Can merge horizontally");
                return false;
            }
        }
    }

    // This looks for possible vertical merges
    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 1; r++) {
            if (board[r][c] === board[r + 1][c]) {
                console.log("Game not over: Can merge vertically");
                return false;
            }
        }
    }

    console.log("Game Over: No moves possible!");
    console.log("Current board state:", board);
    return true;
}


function showGameOverScreen() {
    //stops bg
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    // Update the final score in the modal
    document.getElementById("final-score").innerText = score; 
    // Show the modal
    document.getElementById("game-over-modal").classList.remove("modal-hidden");
}

function hideGameOverScreen() {
    // Hide the modal
    document.getElementById("game-over-modal").classList.add("modal-hidden");
}

function playBackgroundMusic() {
    if (isMusicMuted) return; // Prevent play if muted
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.4; // Set volume a bit lower for background
    // Play needs to be triggered by a user action, which startGame is
    backgroundMusic.play().catch(error => {
        console.error("Background music playback prevented:", error);
    });
}


// Sound
function playSlideSound() {
    if (!gameStarted) return; // CHECK ADDED HERE
    slideSound.currentTime = 0;
    slideSound.play();
}