/**
 * Jeu de Dames - Version complète avec IA
 * Règles internationales (plateau 10x10)
 */

class CheckersGame {
    constructor() {
        this.BOARD_SIZE = 10;
        this.board = [];
        this.currentPlayer = 'black';
        this.selectedPiece = null;
        this.validMoves = [];
        this.captureSequence = false;
        this.capturedPieces = { black: 0, white: 0 };
        this.mustCapture = [];
        this.gameOver = false;
        this.pieceThatMustCapture = null; // Pour la règle soufflée

        // Timer pour captures multiples
        this.captureTimer = null;
        this.captureTimeLeft = 4;
        this.timerElement = null;

        // Options de jeu
        this.gameMode = 'pvp';
        this.aiDifficulty = 'medium';
        this.player1Name = 'Noir';
        this.player2Name = 'Blanc';
        this.mandatoryCapture = true;
        this.visualHints = true;
        this.souffleeRule = false;

        this.setupWelcomeScreen();
    }

    setupWelcomeScreen() {
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameMode = btn.dataset.mode;

                const aiSection = document.getElementById('ai-section');
                const player2Group = document.getElementById('player2-group');

                if (this.gameMode === 'ai') {
                    aiSection.classList.remove('hidden');
                    player2Group.classList.add('hidden');
                } else {
                    aiSection.classList.add('hidden');
                    player2Group.classList.remove('hidden');
                }
            });
        });

        const diffBtns = document.querySelectorAll('.diff-btn');
        diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.aiDifficulty = btn.dataset.diff;
            });
        });

        const mandatoryCaptureCheckbox = document.getElementById('option-mandatory-capture');
        const souffleeOption = document.getElementById('soufflee-option');

        mandatoryCaptureCheckbox.addEventListener('change', () => {
            if (!mandatoryCaptureCheckbox.checked) {
                document.getElementById('option-soufflee').checked = false;
                souffleeOption.style.display = 'none';
            } else {
                souffleeOption.style.display = 'flex';
            }
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        this.player1Name = document.getElementById('player1-name').value.trim() || 'Noir';
        this.player2Name = this.gameMode === 'ai' ? 'Ordinateur' :
            (document.getElementById('player2-name').value.trim() || 'Blanc');

        this.mandatoryCapture = document.getElementById('option-mandatory-capture').checked;
        this.visualHints = document.getElementById('option-visual-hints').checked;
        this.souffleeRule = document.getElementById('option-soufflee').checked;

        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');

        document.getElementById('display-player1').textContent = this.player1Name;
        document.getElementById('display-player2').textContent = this.player2Name;

        this.init();
    }

    init() {
        this.createBoard();
        this.setupEventListeners();
        this.render();
        this.updateUI();
    }

    createBoard() {
        this.board = [];
        for (let row = 0; row < this.BOARD_SIZE; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < 4) {
                        this.board[row][col] = { color: 'black', isKing: false };
                    } else if (row > 5) {
                        this.board[row][col] = { color: 'white', isKing: false };
                    } else {
                        this.board[row][col] = null;
                    }
                } else {
                    this.board[row][col] = null;
                }
            }
        }
    }

    setupEventListeners() {
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            this.backToMenu();
        });

        document.getElementById('rules-btn').addEventListener('click', () => {
            document.getElementById('rules-modal').classList.add('show');
        });

        document.getElementById('modal-close').addEventListener('click', () => {
            document.getElementById('rules-modal').classList.remove('show');
        });

        document.getElementById('rules-modal').addEventListener('click', (e) => {
            if (e.target.id === 'rules-modal') {
                e.target.classList.remove('show');
            }
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            document.getElementById('winner-modal').classList.remove('show');
            this.restart();
        });

        document.getElementById('back-menu-btn').addEventListener('click', () => {
            document.getElementById('winner-modal').classList.remove('show');
            this.backToMenu();
        });

        document.getElementById('soufflee-ok-btn').addEventListener('click', () => {
            document.getElementById('soufflee-modal').classList.remove('show');
        });
    }

    backToMenu() {
        this.stopCaptureTimer();
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('welcome-screen').classList.remove('hidden');
        this.gameOver = false;
    }

    render() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = `cell ${(row + col) % 2 === 0 ? 'cell-light' : 'cell-dark'}`;
                cell.dataset.row = row;
                cell.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece piece-${piece.color}${piece.isKing ? ' king' : ''}`;
                    pieceElement.id = `piece-${row}-${col}`;
                    cell.appendChild(pieceElement);
                }

                cell.addEventListener('click', () => this.handleCellClick(row, col));
                cell.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.handleCellClick(row, col);
                });

                boardElement.appendChild(cell);
            }
        }

        if (this.visualHints) {
            this.highlightValidMoves();
            this.highlightMustCapture();
        }
    }

    handleCellClick(row, col) {
        if (this.gameOver) return;

        // Si c'est le tour de l'IA, ignorer les clics
        if (this.gameMode === 'ai' && this.currentPlayer === 'white') return;

        const piece = this.board[row][col];

        // Si on est en séquence de capture avec timer
        if (this.captureSequence) {
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (move) {
                this.stopCaptureTimer();
                this.executeMove(move);
            }
            return;
        }

        // Si c'est un pion du joueur actuel
        if (piece && piece.color === this.currentPlayer) {
            // Avec la règle soufflée : on peut sélectionner n'importe quel pion
            // Sans la règle soufflée mais avec capture obligatoire : on ne peut sélectionner que les pions qui peuvent capturer
            if (this.mandatoryCapture && this.mustCapture.length > 0 && !this.souffleeRule) {
                const canCapture = this.mustCapture.some(m => m.fromRow === row && m.fromCol === col);
                if (!canCapture) {
                    this.showMessage('Capture obligatoire!');
                    return;
                }
            }

            this.selectPiece(row, col);
        }
        // Si c'est un mouvement valide
        else if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.row === row && m.col === col);
            if (move) {
                // Règle soufflée : vérifier si le joueur ignore une capture
                if (this.souffleeRule && this.pieceThatMustCapture && this.mustCapture.length > 0) {
                    // Vérifier si ce mouvement est une capture ou non
                    if (!move.isCapture) {
                        // Le joueur fait un mouvement simple alors qu'une capture était possible
                        // Sauvegarder la position du pion à souffler
                        const souffleeRow = this.pieceThatMustCapture.row;
                        const souffleeCol = this.pieceThatMustCapture.col;

                        // Exécuter le mouvement d'abord
                        this.executeMoveWithoutSwitch(move);

                        // Puis appliquer la règle soufflée au pion qui devait capturer
                        // (seulement s'il existe encore, car le joueur pourrait avoir bougé ce même pion)
                        if (this.board[souffleeRow] && this.board[souffleeRow][souffleeCol]) {
                            setTimeout(() => {
                                this.applySouffleeRule(souffleeRow, souffleeCol);
                            }, 400);
                        } else {
                            // Le pion qui devait capturer a été déplacé, donc pas de soufflée
                            // Mais on change quand même de joueur
                            this.switchPlayer();
                        }
                        return;
                    }
                }
                this.executeMove(move);
            }
        }
    }

    applySouffleeRule(row, col) {
        const piece = this.board[row][col];
        if (!piece) return;

        // Animation du pion soufflé
        const pieceElement = document.getElementById(`piece-${row}-${col}`);
        const cellElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

        if (pieceElement) {
            pieceElement.classList.add('soufflee');
        }
        if (cellElement) {
            cellElement.classList.add('soufflee-cell');
        }

        // Attendre la fin de l'animation
        setTimeout(() => {
            // Retirer le pion
            this.board[row][col] = null;
            this.capturedPieces[piece.color]++;

            // Afficher le message avec prévisualisation
            const playerName = piece.color === 'black' ? this.player1Name : this.player2Name;
            const piecePreview = document.getElementById('soufflee-piece-preview');
            piecePreview.className = `soufflee-piece-preview ${piece.color}`;

            // Ajouter la classe king si c'était une dame
            if (piece.isKing) {
                piecePreview.classList.add('king');
            }

            const pieceType = piece.isKing ? 'La dame' : 'Le pion';
            document.getElementById('soufflee-description').textContent =
                `${pieceType} de ${playerName} n'a pas capturé ! Il est retiré du jeu.`;
            document.getElementById('soufflee-modal').classList.add('show');

            // Reset
            this.pieceThatMustCapture = null;
            this.render();
            this.updateUI();
            this.checkGameOver();

            // Changer de joueur après la soufflée
            if (!this.gameOver) {
                this.switchPlayer();
            }
        }, 1000);
    }

    selectPiece(row, col) {
        this.selectedPiece = { row, col };
        this.validMoves = this.getValidMovesForSoufflee(row, col);
        this.render();
    }

    getValidMovesForSoufflee(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const captures = [];

        if (piece.isKing) {
            this.getKingMoves(row, col, piece, moves, captures);
        } else {
            this.getPawnMoves(row, col, piece, moves, captures);
        }

        // Avec la règle soufflée : retourner tous les mouvements (captures + simples)
        if (this.souffleeRule) {
            // Les captures restent prioritaires pour l'affichage, mais les mouvements simples sont aussi permis
            return [...captures, ...moves];
        }

        // Sans règle soufflée : comportement normal
        if (this.mandatoryCapture && captures.length > 0) {
            return captures;
        }

        if (this.mandatoryCapture && this.mustCapture.length > 0) {
            const thisCanCapture = captures.length > 0;
            if (!thisCanCapture) return [];
        }

        return captures.length > 0 ? captures : moves;
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const captures = [];

        if (piece.isKing) {
            this.getKingMoves(row, col, piece, moves, captures);
        } else {
            this.getPawnMoves(row, col, piece, moves, captures);
        }

        if (this.mandatoryCapture && captures.length > 0) {
            return captures;
        }

        return captures.length > 0 ? captures : moves;
    }

    getPawnMoves(row, col, piece, moves, captures) {
        const directions = piece.color === 'black' ? [1] : [-1];
        const captureDirections = [1, -1];

        for (const dRow of directions) {
            for (const dCol of [-1, 1]) {
                const newRow = row + dRow;
                const newCol = col + dCol;
                if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                    moves.push({ row: newRow, col: newCol, isCapture: false });
                }
            }
        }

        for (const dRow of captureDirections) {
            for (const dCol of [-1, 1]) {
                const captureRow = row + dRow;
                const captureCol = col + dCol;
                const landRow = row + dRow * 2;
                const landCol = col + dCol * 2;

                if (this.isValidPosition(landRow, landCol)) {
                    const capturedPiece = this.board[captureRow][captureCol];
                    const landingCell = this.board[landRow][landCol];

                    if (capturedPiece && capturedPiece.color !== piece.color && !landingCell) {
                        captures.push({
                            row: landRow,
                            col: landCol,
                            isCapture: true,
                            capturedRow: captureRow,
                            capturedCol: captureCol
                        });
                    }
                }
            }
        }
    }

    getKingMoves(row, col, piece, moves, captures) {
        const directions = [
            { dRow: -1, dCol: -1 },
            { dRow: -1, dCol: 1 },
            { dRow: 1, dCol: -1 },
            { dRow: 1, dCol: 1 }
        ];

        for (const { dRow, dCol } of directions) {
            let currentRow = row + dRow;
            let currentCol = col + dCol;
            let foundEnemy = null;

            while (this.isValidPosition(currentRow, currentCol)) {
                const currentPiece = this.board[currentRow][currentCol];

                if (currentPiece) {
                    if (currentPiece.color === piece.color) {
                        break;
                    } else if (!foundEnemy) {
                        foundEnemy = { row: currentRow, col: currentCol };
                    } else {
                        break;
                    }
                } else {
                    if (foundEnemy) {
                        captures.push({
                            row: currentRow,
                            col: currentCol,
                            isCapture: true,
                            capturedRow: foundEnemy.row,
                            capturedCol: foundEnemy.col
                        });
                    } else {
                        moves.push({ row: currentRow, col: currentCol, isCapture: false });
                    }
                }

                currentRow += dRow;
                currentCol += dCol;
            }
        }
    }

    executeMove(move) {
        const { row: fromRow, col: fromCol } = this.selectedPiece;
        const piece = this.board[fromRow][fromCol];

        this.board[move.row][move.col] = piece;
        this.board[fromRow][fromCol] = null;

        this.animateMove(move.row, move.col);

        if (move.isCapture) {
            const capturedPiece = this.board[move.capturedRow][move.capturedCol];
            this.board[move.capturedRow][move.capturedCol] = null;
            this.capturedPieces[capturedPiece.color]++;

            this.selectedPiece = { row: move.row, col: move.col };

            // Vérifier la promotion avant de chercher d'autres captures
            this.checkPromotion(move.row, move.col);

            const additionalCaptures = this.getValidMoves(move.row, move.col)
                .filter(m => m.isCapture);

            if (additionalCaptures.length > 0) {
                this.captureSequence = true;
                this.validMoves = additionalCaptures;
                this.render();
                this.updateUI();

                // Démarrer le timer silencieux si la règle soufflée est active
                if (this.souffleeRule) {
                    this.startCaptureTimer(move.row, move.col);
                }
                return;
            }
        }

        this.captureSequence = false;
        this.pieceThatMustCapture = null;
        this.checkPromotion(move.row, move.col);
        this.selectedPiece = null;
        this.validMoves = [];
        this.switchPlayer();
    }

    // Exécuter un mouvement sans changer de joueur (pour la règle soufflée)
    executeMoveWithoutSwitch(move) {
        const { row: fromRow, col: fromCol } = this.selectedPiece;
        const piece = this.board[fromRow][fromCol];

        this.board[move.row][move.col] = piece;
        this.board[fromRow][fromCol] = null;

        this.animateMove(move.row, move.col);
        this.checkPromotion(move.row, move.col);

        this.captureSequence = false;
        this.selectedPiece = null;
        this.validMoves = [];

        this.render();
        this.updateUI();
    }

    // ========================================
    // TIMER POUR CAPTURES MULTIPLES (invisible)
    // ========================================

    startCaptureTimer(pieceRow, pieceCol) {
        this.captureTimeLeft = 4000; // 4 secondes en millisecondes

        // Timer silencieux en arrière-plan
        this.captureTimer = setTimeout(() => {
            this.handleTimerExpired(pieceRow, pieceCol);
        }, 4000);
    }

    stopCaptureTimer() {
        if (this.captureTimer) {
            clearTimeout(this.captureTimer);
            this.captureTimer = null;
        }
    }

    handleTimerExpired(pieceRow, pieceCol) {
        // Le joueur n'a pas continué la capture dans les 4 secondes
        // Appliquer la règle soufflée

        // Le pion/dame qui aurait dû continuer à capturer est soufflé
        const piece = this.board[pieceRow][pieceCol];
        if (piece) {
            // Animation du pion soufflé
            const pieceElement = document.getElementById(`piece-${pieceRow}-${pieceCol}`);
            const cellElement = document.querySelector(`.cell[data-row="${pieceRow}"][data-col="${pieceCol}"]`);

            if (pieceElement) {
                pieceElement.classList.add('soufflee');
            }
            if (cellElement) {
                cellElement.classList.add('soufflee-cell');
            }

            setTimeout(() => {
                this.board[pieceRow][pieceCol] = null;
                this.capturedPieces[piece.color]++;

                const playerName = piece.color === 'black' ? this.player1Name : this.player2Name;
                const piecePreview = document.getElementById('soufflee-piece-preview');
                piecePreview.className = `soufflee-piece-preview ${piece.color}`;

                // Ajouter la classe king si c'était une dame
                if (piece.isKing) {
                    piecePreview.classList.add('king');
                }

                const pieceType = piece.isKing ? 'La dame' : 'Le pion';
                document.getElementById('soufflee-description').textContent =
                    `${pieceType} de ${playerName} n'a pas continué la capture à temps! Il est retiré du jeu.`;
                document.getElementById('soufflee-modal').classList.add('show');

                this.captureSequence = false;
                this.selectedPiece = null;
                this.validMoves = [];
                this.pieceThatMustCapture = null;

                this.render();
                this.updateUI();
                this.checkGameOver();

                if (!this.gameOver) {
                    this.switchPlayer();
                }
            }, 1000);
        }
    }

    checkPromotion(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.isKing) return;

        if ((piece.color === 'black' && row === this.BOARD_SIZE - 1) ||
            (piece.color === 'white' && row === 0)) {
            piece.isKing = true;
            this.showMessage('Dame!');
        }
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        this.calculateMustCapture();

        // Mémoriser le premier pion qui doit capturer (pour la règle soufflée)
        if (this.souffleeRule && this.mustCapture.length > 0) {
            this.pieceThatMustCapture = {
                row: this.mustCapture[0].fromRow,
                col: this.mustCapture[0].fromCol
            };
        } else {
            this.pieceThatMustCapture = null;
        }

        this.render();
        this.updateUI();
        this.checkGameOver();

        if (!this.gameOver && this.gameMode === 'ai' && this.currentPlayer === 'white') {
            this.playAI();
        }
    }

    calculateMustCapture() {
        this.mustCapture = [];

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    const moves = [];
                    const captures = [];

                    if (piece.isKing) {
                        this.getKingMoves(row, col, piece, moves, captures);
                    } else {
                        this.getPawnMoves(row, col, piece, moves, captures);
                    }

                    for (const capture of captures) {
                        this.mustCapture.push({
                            fromRow: row,
                            fromCol: col,
                            ...capture
                        });
                    }
                }
            }
        }
    }

    highlightValidMoves() {
        for (const move of this.validMoves) {
            const cell = document.querySelector(
                `.cell[data-row="${move.row}"][data-col="${move.col}"]`
            );
            if (cell) {
                cell.classList.add(move.isCapture ? 'capture-move' : 'valid-move');
            }
        }

        if (this.selectedPiece) {
            const selectedCell = document.querySelector(
                `.cell[data-row="${this.selectedPiece.row}"][data-col="${this.selectedPiece.col}"]`
            );
            if (selectedCell) {
                selectedCell.classList.add('selected');
            }
        }
    }

    highlightMustCapture() {
        // Ne pas highlight si règle soufflée (le joueur peut choisir librement)
        if (this.mustCapture.length > 0 && !this.selectedPiece && this.mandatoryCapture && !this.souffleeRule) {
            const uniquePieces = new Set();
            for (const capture of this.mustCapture) {
                uniquePieces.add(`${capture.fromRow}-${capture.fromCol}`);
            }

            for (const key of uniquePieces) {
                const [row, col] = key.split('-');
                const cell = document.querySelector(
                    `.cell[data-row="${row}"][data-col="${col}"]`
                );
                if (cell) {
                    cell.classList.add('selected');
                }
            }
        }
    }

    animateMove(row, col) {
        setTimeout(() => {
            const cell = document.querySelector(
                `.cell[data-row="${row}"][data-col="${col}"] .piece`
            );
            if (cell) {
                cell.classList.add('moving');
                setTimeout(() => cell.classList.remove('moving'), 300);
            }
        }, 10);
    }

    // ========================================
    // INTELLIGENCE ARTIFICIELLE
    // ========================================

    playAI() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'ai-thinking';
        thinkingDiv.id = 'ai-thinking';
        thinkingDiv.innerHTML = `
            <span>L'ordinateur réfléchit</span>
            <div class="ai-thinking-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        document.body.appendChild(thinkingDiv);

        const delay = this.aiDifficulty === 'easy' ? 500 :
                      this.aiDifficulty === 'medium' ? 800 : 1200;

        setTimeout(() => {
            const move = this.getBestMove();
            document.getElementById('ai-thinking').remove();

            if (move) {
                this.executeAIMove(move);
            }
        }, delay);
    }

    getBestMove() {
        const depth = this.aiDifficulty === 'easy' ? 1 :
                      this.aiDifficulty === 'medium' ? 3 : 5;

        const moves = this.getAllMoves('white');

        if (moves.length === 0) return null;

        if (this.aiDifficulty === 'easy') {
            const captures = moves.filter(m => m.move.isCapture);
            if (captures.length > 0) {
                return captures[Math.floor(Math.random() * captures.length)];
            }
            return moves[Math.floor(Math.random() * moves.length)];
        }

        let bestMove = null;
        let bestScore = -Infinity;

        for (const moveData of moves) {
            const boardCopy = this.copyBoard();
            this.simulateMove(moveData);

            const score = this.minimax(depth - 1, -Infinity, Infinity, false);

            this.board = boardCopy;

            if (score > bestScore) {
                bestScore = score;
                bestMove = moveData;
            }
        }

        return bestMove;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return this.evaluateBoard();
        }

        const color = isMaximizing ? 'white' : 'black';
        const moves = this.getAllMoves(color);

        if (moves.length === 0) {
            return isMaximizing ? -1000 : 1000;
        }

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const moveData of moves) {
                const boardCopy = this.copyBoard();
                this.simulateMove(moveData);
                const score = this.minimax(depth - 1, alpha, beta, false);
                this.board = boardCopy;
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const moveData of moves) {
                const boardCopy = this.copyBoard();
                this.simulateMove(moveData);
                const score = this.minimax(depth - 1, alpha, beta, true);
                this.board = boardCopy;
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }

    evaluateBoard() {
        let score = 0;

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    let pieceValue = piece.isKing ? 5 : 1;

                    if (!piece.isKing) {
                        if (piece.color === 'white') {
                            pieceValue += (this.BOARD_SIZE - 1 - row) * 0.1;
                        } else {
                            pieceValue += row * 0.1;
                        }
                    }

                    const centerDistance = Math.abs(col - 4.5) + Math.abs(row - 4.5);
                    pieceValue += (5 - centerDistance) * 0.05;

                    if (col === 0 || col === 9) {
                        pieceValue += 0.2;
                    }

                    if (piece.color === 'white') {
                        score += pieceValue;
                    } else {
                        score -= pieceValue;
                    }
                }
            }
        }

        return score;
    }

    getAllMoves(color) {
        const allMoves = [];
        const captures = [];

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = [];
                    const pieceCaptures = [];

                    if (piece.isKing) {
                        this.getKingMoves(row, col, piece, moves, pieceCaptures);
                    } else {
                        this.getPawnMoves(row, col, piece, moves, pieceCaptures);
                    }

                    for (const move of pieceCaptures) {
                        captures.push({ fromRow: row, fromCol: col, move });
                    }

                    for (const move of moves) {
                        allMoves.push({ fromRow: row, fromCol: col, move });
                    }
                }
            }
        }

        if (this.mandatoryCapture && captures.length > 0) {
            return captures;
        }

        return captures.length > 0 ? captures : allMoves;
    }

    simulateMove(moveData) {
        const { fromRow, fromCol, move } = moveData;
        const piece = this.board[fromRow][fromCol];

        this.board[move.row][move.col] = piece;
        this.board[fromRow][fromCol] = null;

        if (move.isCapture) {
            this.board[move.capturedRow][move.capturedCol] = null;
        }

        if (piece && !piece.isKing) {
            if ((piece.color === 'black' && move.row === this.BOARD_SIZE - 1) ||
                (piece.color === 'white' && move.row === 0)) {
                piece.isKing = true;
            }
        }
    }

    copyBoard() {
        return this.board.map(row =>
            row.map(cell => cell ? { ...cell } : null)
        );
    }

    executeAIMove(moveData) {
        this.selectedPiece = { row: moveData.fromRow, col: moveData.fromCol };
        this.executeMove(moveData.move);
    }

    // ========================================
    // FIN DE PARTIE
    // ========================================

    checkGameOver() {
        const blackPieces = [];
        const whitePieces = [];

        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (piece.color === 'black') {
                        blackPieces.push({ row, col });
                    } else {
                        whitePieces.push({ row, col });
                    }
                }
            }
        }

        if (blackPieces.length === 0) {
            this.endGame('white', 'Tous les pions noirs ont été capturés!');
            return;
        }
        if (whitePieces.length === 0) {
            this.endGame('black', 'Tous les pions blancs ont été capturés!');
            return;
        }

        const currentPieces = this.currentPlayer === 'black' ? blackPieces : whitePieces;
        let hasValidMove = false;

        for (const { row, col } of currentPieces) {
            const moves = [];
            const captures = [];
            const piece = this.board[row][col];

            if (piece.isKing) {
                this.getKingMoves(row, col, piece, moves, captures);
            } else {
                this.getPawnMoves(row, col, piece, moves, captures);
            }

            if (moves.length > 0 || captures.length > 0) {
                hasValidMove = true;
                break;
            }
        }

        if (!hasValidMove) {
            const winner = this.currentPlayer === 'black' ? 'white' : 'black';
            const loserName = this.currentPlayer === 'black' ? this.player1Name : this.player2Name;
            this.endGame(winner, `${loserName} est bloqué!`);
        }
    }

    endGame(winner, description) {
        this.gameOver = true;
        this.stopCaptureTimer();

        const winnerModal = document.getElementById('winner-modal');
        const winnerText = document.getElementById('winner-text');
        const winnerDescription = document.getElementById('winner-description');
        const winnerTrophy = document.getElementById('winner-trophy');

        const winnerName = winner === 'black' ? this.player1Name : this.player2Name;

        if (winnerName.toLowerCase() === 'jules') {
            winnerText.textContent = 'Bien joué mon doudou!';
            winnerTrophy.textContent = '💖';
        } else {
            winnerText.textContent = `${winnerName} gagne!`;
            winnerTrophy.textContent = '🏆';
        }

        winnerDescription.textContent = description;

        setTimeout(() => {
            winnerModal.classList.add('show');
        }, 500);
    }

    updateUI() {
        const turnIndicator = document.getElementById('current-turn');
        turnIndicator.className = `current-turn ${this.currentPlayer === 'black' ? 'black-piece' : 'white-piece'}`;

        const currentPlayerName = document.getElementById('current-player-name');
        currentPlayerName.textContent = this.currentPlayer === 'black' ? this.player1Name : this.player2Name;

        document.getElementById('black-captured').textContent = this.capturedPieces.white;
        document.getElementById('white-captured').textContent = this.capturedPieces.black;
    }

    showMessage(text) {
        const messageElement = document.getElementById('game-message');
        messageElement.textContent = text;
        messageElement.classList.add('show');

        setTimeout(() => {
            messageElement.classList.remove('show');
        }, 2000);
    }

    restart() {
        this.stopCaptureTimer();
        this.board = [];
        this.currentPlayer = 'black';
        this.selectedPiece = null;
        this.validMoves = [];
        this.captureSequence = false;
        this.capturedPieces = { black: 0, white: 0 };
        this.mustCapture = [];
        this.pieceThatMustCapture = null;
        this.gameOver = false;

        this.createBoard();
        this.render();
        this.updateUI();
        this.showMessage('Nouvelle partie!');
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.BOARD_SIZE && col >= 0 && col < this.BOARD_SIZE;
    }
}

// Démarrer le jeu
document.addEventListener('DOMContentLoaded', () => {
    new CheckersGame();
});

// Empêcher le zoom sur double-tap mobile
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });
