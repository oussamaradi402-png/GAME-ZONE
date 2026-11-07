
// ======================================
// GAME ZONE - PLAYER SYSTEM
// ======================================

let playerName = localStorage.getItem("gzPlayer") || "";
let totalPoints = 0;
let gameTimer = null;
let gameTimeout = null;
let gameActive = false;

const area = document.getElementById("game-area");

async function loginPlayer(name) {
    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name})
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Login failed");
            return false;
        }

        playerName = data.name;
        totalPoints = data.points;
        localStorage.setItem("gzPlayer", playerName);
        updateRewards();
        updatePlayerName();
        loadLeaderboard();
        return true;
    } catch (error) {
        alert("Cannot connect to the server. Make sure Flask is running.");
        return false;
    }
}

function updatePlayerName() {
    document.getElementById("welcome-name").textContent = "Welcome, " + playerName;
    document.getElementById("sidebar-name").textContent = playerName;
}

async function changePlayer() {
    const name = prompt("Enter your player name (2 to 20 characters):");
    if (!name) return;
    await loginPlayer(name.trim());
}

function updateRewards() {
    const level = Math.floor(totalPoints / 100) + 1;
    const rewards = [50, 150, 300].filter(x => totalPoints >= x).length;

    document.getElementById("total-points").textContent = totalPoints;
    document.getElementById("player-level").textContent = level;
    document.getElementById("reward-count").textContent = rewards;

    document.getElementById("bronze-status").textContent =
        totalPoints >= 50 ? "UNLOCKED" : "LOCKED";
    document.getElementById("silver-status").textContent =
        totalPoints >= 150 ? "UNLOCKED" : "LOCKED";
    document.getElementById("gold-status").textContent =
        totalPoints >= 300 ? "UNLOCKED" : "LOCKED";
}

async function addPoints(points) {
    if (!playerName) {
        alert("Please login first.");
        return;
    }

    try {
        const response = await fetch("/api/score", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: playerName, points})
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not save points.");
            return;
        }

        totalPoints = data.points;
        updateRewards();
        loadLeaderboard();
    } catch (error) {
        alert("Could not save your points. Check the server.");
    }
}

async function loadLeaderboard() {
    const list = document.getElementById("leaderboard-list");

    try {
        const response = await fetch("/api/leaderboard");
        const players = await response.json();

        if (!players.length) {
            list.innerHTML = "<p>No players yet. Be the first!</p>";
            return;
        }

        list.innerHTML = players.map((p, i) => `
            <div class="ranking-row">
                <span>${i + 1}. ${escapeHTML(p.name)}</span>
                <strong>${p.points} PTS</strong>
            </div>
        `).join("");
    } catch (error) {
        list.innerHTML = "<p>Leaderboard unavailable.</p>";
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
    })[char]);
}

function stopGame() {
    clearInterval(gameTimer);
    clearTimeout(gameTimeout);
    gameTimer = null;
    gameTimeout = null;
    gameActive = false;
    document.onkeydown = null;
}

function closeGame() {
    stopGame();
    area.innerHTML = `
        <div class="empty-game">
            <div>🎮</div>
            <h3>Your game will appear here</h3>
            <p>Choose a game above to start playing.</p>
        </div>`;
}

function playGame(game) {
    if (!playerName) {
        alert("Login first to play and save your points.");
        changePlayer();
        if (!playerName) return;
    }

    stopGame();
    document.getElementById("game-section").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    const games = {
        snake: startSnake,
        tic: startTicTacToe,
        memory: startMemory,
        quiz: startQuiz,
        football: startFootball,
        basketball: startBasketball,
        tennis: startTennis,
        bicycle: () => startLaneGame("BICYCLE", "🚴", "bicycle"),
        moto: () => startLaneGame("MOTORCYCLE", "🏍️", "moto"),
        car: () => startLaneGame("CAR RACING", "🏎️", "car"),
        taxi: () => startLaneGame("TAXI DRIVER", "🚕", "taxi")
    };

    if (games[game]) games[game]();
}

// ======================================
// 1. SNAKE
// ======================================

function startSnake() {
    area.innerHTML = `
        <h2>🐍 SNAKE GAME</h2>
        <h3>Score: <span id="snake-score">0</span></h3>
        <canvas id="snake-canvas" width="400" height="400"></canvas>
        <p>Use arrow keys to move.</p>
        <button onclick="playGame('snake')">RESTART</button>`;

    const canvas = document.getElementById("snake-canvas");
    const ctx = canvas.getContext("2d");
    let snake = [{x: 200, y: 200}];
    let food = {x: 100, y: 100};
    let dx = 20, dy = 0, score = 0;
    gameActive = true;

    function newFood() {
        do {
            food = {
                x: Math.floor(Math.random() * 20) * 20,
                y: Math.floor(Math.random() * 20) * 20
            };
        } while (snake.some(p => p.x === food.x && p.y === food.y));
    }

    document.onkeydown = e => {
        if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -20; }
        else if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 20; }
        else if (e.key === "ArrowLeft" && dx === 0) { dx = -20; dy = 0; }
        else if (e.key === "ArrowRight" && dx === 0) { dx = 20; dy = 0; }
        if (e.key.startsWith("Arrow")) e.preventDefault();
    };

    function draw() {
        if (!gameActive) return;

        const head = {x: snake[0].x + dx, y: snake[0].y + dy};
        const eating = head.x === food.x && head.y === food.y;
        const body = eating ? snake : snake.slice(0, -1);

        if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 ||
            body.some(p => p.x === head.x && p.y === head.y)) {
            stopGame();
            area.innerHTML += `<h2>GAME OVER</h2><p>Score: ${score}</p>
                <button onclick="playGame('snake')">PLAY AGAIN</button>`;
            return;
        }

        snake.unshift(head);

        if (eating) {
            score++;
            document.getElementById("snake-score").textContent = score;
            addPoints(10);
            newFood();
        } else {
            snake.pop();
        }

        ctx.fillStyle = "#080808";
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = "#d4af37";
        snake.forEach(p => ctx.fillRect(p.x + 1, p.y + 1, 18, 18));
        ctx.fillStyle = "#ff405e";
        ctx.fillRect(food.x + 1, food.y + 1, 18, 18);
    }

    gameTimer = setInterval(draw, 130);
}

// ======================================
// 2. TIC TAC TOE - TWO PLAYERS
// ======================================

function startTicTacToe() {
    let board = ["","","","","","","","",""];
    let player = "X";
    let finished = false;
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    function winner() {
        for (const line of lines) {
            const [a,b,c] = line;
            if (board[a] && board[a] === board[b] && board[b] === board[c]) {
                return board[a];
            }
        }
        return null;
    }

    function render() {
        area.innerHTML = `
            <h2>⭕ TIC TAC TOE</h2>
            <h3>${finished ? "GAME FINISHED" : "PLAYER " + player + "'S TURN"}</h3>
            <div class="tic-grid">
                ${board.map((v,i) => `
                    <button style="width:75px;height:75px;font-size:30px"
                    onclick="moveTic(${i})" ${v || finished ? "disabled" : ""}>${v}</button>
                `).join("")}
            </div>
            <button onclick="playGame('tic')">RESTART</button>`;
    }

    window.moveTic = function(i) {
        if (finished || board[i]) return;

        board[i] = player;
        const result = winner();

        if (result) {
            finished = true;
            render();
            area.innerHTML += `<h2>PLAYER ${result} WINS!</h2>`;
            if (result === "X") {
                area.innerHTML += "<p>Player X earns 20 points.</p>";
                addPoints(20);
            }
            return;
        }

        if (board.every(Boolean)) {
            finished = true;
            render();
            area.innerHTML += "<h2>DRAW!</h2>";
            return;
        }

        player = player === "X" ? "O" : "X";
        render();
    };

    render();
}

// ======================================
// 3. MEMORY
// ======================================

function startMemory() {
    let cards = ["🍎","🍌","🍇","🍒","🍎","🍌","🍇","🍒"];
    cards.sort(() => Math.random() - 0.5);

    let opened = [];
    let matched = [];
    let locked = false;
    let finished = false;

    function render() {
        area.innerHTML = `
            <h2>🧠 MEMORY GAME</h2>
            <h3>Pairs: ${matched.length / 2} / 4</h3>
            <div class="memory-grid">
                ${cards.map((c,i) => `
                    <button style="width:65px;height:65px;font-size:24px"
                    onclick="flipMemory(${i})"
                    ${(matched.includes(i) || opened.includes(i) || locked) ? "disabled" : ""}>
                    ${matched.includes(i) || opened.includes(i) ? c : "?"}</button>
                `).join("")}
            </div>
            <button onclick="playGame('memory')">RESTART</button>`;
    }

    window.flipMemory = function(i) {
        if (locked || finished || opened.includes(i) || matched.includes(i)) return;

        opened.push(i);
        render();

        if (opened.length === 2) {
            if (cards[opened[0]] === cards[opened[1]]) {
                matched.push(...opened);
                opened = [];

                if (matched.length === cards.length) {
                    finished = true;
                    render();
                    area.innerHTML += "<h2>YOU WIN! +30 POINTS</h2>";
                    addPoints(30);
                } else {
                    render();
                }
            } else {
                locked = true;
                gameTimeout = setTimeout(() => {
                    opened = [];
                    locked = false;
                    render();
                }, 900);
            }
        }
    };

    render();
}

// ======================================
// 4. QUIZ
// ======================================

function startQuiz() {
    const questions = [
        ["What is HTML?", ["Markup language","Browser","Game"], 0],
        ["What is CSS?", ["Database","Style language","Computer"], 1],
        ["What is JavaScript?", ["Programming language","Keyboard","Screen"], 0],
        ["What does CPU mean?", ["Central Processing Unit","Computer Power Unit","Control Program"], 0],
        ["Which is a web browser?", ["Python","Chrome","HTML"], 1],
        ["What is RAM?", ["Temporary memory","Website","Keyboard"], 0],
        ["Which is an operating system?", ["Windows","HTML","CSS"], 0]
    ];

    let index = 0;
    let score = 0;

    function render() {
        if (index >= questions.length) {
            area.innerHTML = `
                <h2>QUIZ FINISHED!</h2>
                <h3>Your score: ${score} / ${questions.length}</h3>
                <p>You earned ${score * 5} points.</p>
                <button onclick="playGame('quiz')">PLAY AGAIN</button>`;
            return;
        }

        const q = questions[index];
        area.innerHTML = `
            <h2>KNOWLEDGE QUIZ</h2>
            <p>Question ${index + 1} / ${questions.length}</p>
            <h3>${q[0]}</h3>
            ${q[1].map((answer,i) =>
                `<button onclick="answerQuiz(${i})">${answer}</button><br>`
            ).join("")}`;
    }

    window.answerQuiz = function(i) {
        if (i === questions[index][2]) {
            score++;
            addPoints(5);
        }
        index++;
        render();
    };

    render();
}

// ======================================
// 5. FOOTBALL PENALTY
// ======================================

function startFootball() {
    let attempts = 5;
    let goals = 0;

    function render() {
        area.innerHTML = `
            <h2>⚽ FOOTBALL PENALTY</h2>
            <h3>Goals: ${goals} | Attempts left: ${attempts}</h3>
            <p>Choose where to shoot.</p>
            <div class="choice-row">
                <button onclick="shootFootball('LEFT')">LEFT</button>
                <button onclick="shootFootball('CENTER')">CENTER</button>
                <button onclick="shootFootball('RIGHT')">RIGHT</button>
            </div>
            <p id="football-message">Take your shot!</p>
            <button onclick="playGame('football')">RESTART</button>`;
    }

    window.shootFootball = function(direction) {
        if (attempts <= 0) return;

        const keeper = ["LEFT","CENTER","RIGHT"][Math.floor(Math.random() * 3)];
        attempts--;

        if (direction !== keeper) {
            goals++;
            addPoints(10);
            document.getElementById("football-message").textContent =
                "GOAL! Great shot! +10 points";
        } else {
            document.getElementById("football-message").textContent =
                "The goalkeeper saved it!";
        }

        if (attempts === 0) {
            area.innerHTML = `
                <h2>FULL TIME</h2>
                <h3>Your goals: ${goals} / 5</h3>
                <button onclick="playGame('football')">PLAY AGAIN</button>`;
        } else {
            document.querySelector("#game-area h3").textContent =
                `Goals: ${goals} | Attempts left: ${attempts}`;
        }
    };

    render();
}

// ======================================
// 6. BASKETBALL
// ======================================

function startBasketball() {
    let attempts = 5;
    let baskets = 0;

    function render() {
        area.innerHTML = `
            <h2>🏀 BASKETBALL SHOOTOUT</h2>
            <h3>Baskets: ${baskets} | Shots left: ${attempts}</h3>
            <p>Choose your shooting power.</p>
            <button onclick="shootBasket(1)">LOW POWER</button>
            <button onclick="shootBasket(2)">MEDIUM POWER</button>
            <button onclick="shootBasket(3)">HIGH POWER</button>
            <p id="basket-message">Take your shot!</p>
            <button onclick="playGame('basketball')">RESTART</button>`;
    }

    window.shootBasket = function(power) {
        if (attempts <= 0) return;

        attempts--;
        const target = Math.ceil(Math.random() * 3);

        if (power === target) {
            baskets++;
            addPoints(10);
            document.getElementById("basket-message").textContent =
                "SCORE! +10 points";
        } else {
            document.getElementById("basket-message").textContent =
                "Missed! Try another shot.";
        }

        if (attempts === 0) {
            area.innerHTML = `
                <h2>SHOOTOUT FINISHED</h2>
                <h3>Baskets: ${baskets} / 5</h3>
                <button onclick="playGame('basketball')">PLAY AGAIN</button>`;
        } else {
            document.querySelector("#game-area h3").textContent =
                `Baskets: ${baskets} | Shots left: ${attempts}`;
        }
    };

    render();
}

// ======================================
// 7. TENNIS
// ======================================

function startTennis() {
    let hits = 0;
    let attempts = 5;

    function render() {
        area.innerHTML = `
            <h2>🎾 TENNIS CHALLENGE</h2>
            <h3>Successful returns: ${hits} | Attempts: ${attempts}</h3>
            <p>Press RETURN when the ball comes to you.</p>
            <button onclick="returnTennis()">RETURN BALL</button>
            <p id="tennis-message">Ready to play?</p>
            <button onclick="playGame('tennis')">RESTART</button>`;
    }

    window.returnTennis = function() {
        if (attempts <= 0) return;

        attempts--;
        if (Math.random() > 0.35) {
            hits++;
            addPoints(8);
            document.getElementById("tennis-message").textContent =
                "Excellent return! +8 points";
        } else {
            document.getElementById("tennis-message").textContent =
                "Out! Try again.";
        }

        if (attempts === 0) {
            area.innerHTML = `
                <h2>MATCH FINISHED</h2>
                <h3>Successful returns: ${hits} / 5</h3>
                <button onclick="playGame('tennis')">PLAY AGAIN</button>`;
        } else {
            document.querySelector("#game-area h3").textContent =
                `Successful returns: ${hits} | Attempts: ${attempts}`;
        }
    };

    render();
}

// ======================================
// 8-11. BICYCLE / MOTO / CAR / TAXI
// ======================================

function startLaneGame(title, vehicle, type) {
    let lane = 1;
    let score = 0;
    let seconds = 25;
    let obstacles = [];
    let passengerReady = type === "taxi";
    let running = true;

    function render() {
        area.innerHTML = `
            <h2>${vehicle} ${title}</h2>
            <h3>Score: <span id="road-score">0</span> | Time: <span id="road-time">25</span>s</h3>
            <div id="road-track">
                <div class="road-lane" data-lane="0"></div>
                <div class="road-lane" data-lane="1"></div>
                <div class="road-lane" data-lane="2"></div>
                <div id="road-player">${vehicle}</div>
                <div id="road-obstacles"></div>
            </div>
            <p>Use the buttons or keyboard arrows to change lane.</p>
            <div class="choice-row">
                <button onclick="moveRoad(-1)">LEFT</button>
                <button onclick="moveRoad(1)">RIGHT</button>
                ${type === "taxi" ? '<button onclick="taxiAction()">PICK UP / DROP OFF</button>' : ""}
            </div>
            <p id="road-message">${type === "taxi" ? "Find a passenger!" : "Avoid the obstacles!"}</p>
            <button onclick="playGame('${type}')">RESTART</button>`;

        const style = document.createElement("style");
        style.id = "road-game-style";
        style.textContent = `
            #road-track{position:relative;width:min(330px,90%);height:300px;margin:15px auto;
                display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;
                background:#252525;border:3px solid #d4af37;border-radius:8px}
            .road-lane{border-right:2px dashed #777}
            #road-player{position:absolute;bottom:15px;left:calc(${lane} * 33.333% + 4%);
                width:25%;text-align:center;font-size:34px;transition:left .15s}
            .road-obstacle{position:absolute;top:0;font-size:28px;transform:translateX(-50%)}
            .choice-row{display:flex;justify-content:center;flex-wrap:wrap;gap:5px}
        `;
        document.getElementById("road-game-style")?.remove();
        document.head.appendChild(style);
    }

    window.moveRoad = function(direction) {
        if (!running) return;
        lane = Math.max(0, Math.min(2, lane + direction));
        const player = document.getElementById("road-player");
        if (player) player.style.left = `calc(${lane} * 33.333% + 4%)`;
    };

    window.taxiAction = function() {
        if (!running || type !== "taxi") return;

        const message = document.getElementById("road-message");

        if (passengerReady) {
            passengerReady = false;
            score += 20;
            addPoints(20);
            message.textContent = "Passenger dropped off! +20 points";
        } else {
            passengerReady = true;
            message.textContent = "Passenger picked up. Find the next stop!";
        }

        document.getElementById("road-score").textContent = score;
    };

    document.onkeydown = e => {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            moveRoad(-1);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            moveRoad(1);
        }
    };

    function finish() {
        running = false;
        stopGame();
        area.innerHTML = `
            <h2>RACE FINISHED</h2>
            <h3>${title} score: ${score}</h3>
            <p>Thanks for playing.</p>
            <button onclick="playGame('${type}')">PLAY AGAIN</button>`;
    }

    function spawnObstacle() {
        if (!running) return;

        const obstacleLane = Math.floor(Math.random() * 3);
        const obstacle = document.createElement("div");
        obstacle.className = "road-obstacle";
        obstacle.textContent = type === "taxi" ? "👤" : "🚧";
        obstacle.style.left = `${obstacleLane * 33.333 + 16.666}%`;
        obstacle.style.top = "0px";
        document.getElementById("road-obstacles")?.appendChild(obstacle);

        let y = 0;
        const fall = setInterval(() => {
            if (!running) {
                clearInterval(fall);
                obstacle.remove();
                return;
            }

            y += 5;
            obstacle.style.top = y + "px";

            if (y >= 235 && y <= 275 && obstacleLane === lane) {
                clearInterval(fall);
                obstacle.remove();

                if (type === "taxi" && obstacle.textContent === "👤") {
                    document.getElementById("road-message").textContent =
                        "Passenger nearby! Use PICK UP / DROP OFF.";
                } else {
                    finish();
                    return;
                }
            }

            if (y > 310) {
                clearInterval(fall);
                obstacle.remove();
                if (type !== "taxi") {
                    score += 1;
                    document.getElementById("road-score").textContent = score;
                    if (score % 5 === 0) addPoints(5);
                }
            }
        }, 50);
    }

    render();

    gameTimer = setInterval(() => {
        seconds--;
        const timeDisplay = document.getElementById("road-time");
        if (timeDisplay) timeDisplay.textContent = seconds;

        if (seconds <= 0) finish();
    }, 1000);

    gameTimeout = setInterval(spawnObstacle, 1300);
}

// ======================================
// START APP
// ======================================

async function startApp() {
    if (playerName) {
        const ok = await loginPlayer(playerName);
        if (!ok) {
            localStorage.removeItem("gzPlayer");
            playerName = "";
        }
    }

    if (!playerName) {
        await changePlayer();
    }

    updateRewards();
    loadLeaderboard();
}

startApp();

