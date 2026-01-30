/**
 * Web Worker pour l'IA du jeu de dames
 * Permet de calculer le meilleur coup sans bloquer l'interface
 */

const BOARD_SIZE = 10;
let board = [];
let aiDifficulty = 'medium';
let mandatoryCapture = true;

// Recevoir les messages du thread principal
self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'calculate') {
        board = data.board;
        aiDifficulty = data.aiDifficulty;
        mandatoryCapture = data.mandatoryCapture;

        const bestMove = getBestMove();
        self.postMessage({ type: 'result', move: bestMove });
    }
};

function getBestMove() {
    // Profondeurs: facile=1, moyen=4, expert=8
    const depth = aiDifficulty === 'easy' ? 1 :
                  aiDifficulty === 'medium' ? 4 : 8;

    const moves = getAllMoves('black');
    if (moves.length === 0) return null;

    // Mode facile : choix aleatoire
    if (aiDifficulty === 'easy') {
        const captures = moves.filter(m => m.move.isCapture);
        if (captures.length > 0) {
            return captures[Math.floor(Math.random() * captures.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestMove = null;
    let bestScore = Infinity;

    // Trier les mouvements pour ameliorer le pruning
    const sortedMoves = sortMovesByPriority(moves);

    for (const moveData of sortedMoves) {
        // Sauvegarder l'etat pour undo
        const savedState = saveState(moveData);

        // Appliquer le mouvement
        applyMove(moveData);

        // Evaluer (apres le coup noir, c'est au tour des blancs qui maximisent)
        const score = minimax(depth - 1, -Infinity, Infinity, true);

        // Restaurer l'etat
        restoreState(savedState);

        if (score < bestScore) {
            bestScore = score;
            bestMove = moveData;
        }
    }

    return bestMove;
}

// Sauvegarde legere pour undo (au lieu de copier tout le plateau)
function saveState(moveData) {
    const { fromRow, fromCol, move } = moveData;
    return {
        fromRow,
        fromCol,
        toRow: move.row,
        toCol: move.col,
        movedPiece: board[fromRow][fromCol] ? { ...board[fromRow][fromCol] } : null,
        capturedPiece: move.isCapture ?
            (board[move.capturedRow][move.capturedCol] ?
                { ...board[move.capturedRow][move.capturedCol] } : null) : null,
        capturedRow: move.capturedRow,
        capturedCol: move.capturedCol,
        wasKing: board[fromRow][fromCol] ? board[fromRow][fromCol].isKing : false
    };
}

// Appliquer un mouvement
function applyMove(moveData) {
    const { fromRow, fromCol, move } = moveData;
    const piece = board[fromRow][fromCol];

    board[move.row][move.col] = piece;
    board[fromRow][fromCol] = null;

    if (move.isCapture) {
        board[move.capturedRow][move.capturedCol] = null;
    }

    // Promotion
    if (piece && !piece.isKing) {
        if ((piece.color === 'black' && move.row === BOARD_SIZE - 1) ||
            (piece.color === 'white' && move.row === 0)) {
            piece.isKing = true;
        }
    }
}

// Restaurer l'etat precedent
function restoreState(state) {
    // Remettre la piece a sa position d'origine
    board[state.fromRow][state.fromCol] = state.movedPiece;
    if (state.movedPiece) {
        state.movedPiece.isKing = state.wasKing;
    }

    // Vider la case de destination
    board[state.toRow][state.toCol] = null;

    // Restaurer la piece capturee si necessaire
    if (state.capturedPiece) {
        board[state.capturedRow][state.capturedCol] = state.capturedPiece;
    }
}

function sortMovesByPriority(moves) {
    return moves.sort((a, b) => {
        // Priorite aux captures
        if (a.move.isCapture && !b.move.isCapture) return -1;
        if (!a.move.isCapture && b.move.isCapture) return 1;

        // Priorite aux mouvements vers la promotion (row 9 pour les noirs)
        const aPromotionDist = a.move.row;
        const bPromotionDist = b.move.row;
        if (aPromotionDist !== bPromotionDist) return bPromotionDist - aPromotionDist;

        // Priorite au centre
        const aCenterDist = Math.abs(a.move.col - 4.5);
        const bCenterDist = Math.abs(b.move.col - 4.5);
        return aCenterDist - bCenterDist;
    });
}

function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
        return evaluateBoard();
    }

    const color = isMaximizing ? 'white' : 'black';
    const moves = getAllMoves(color);

    if (moves.length === 0) {
        return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const moveData of moves) {
            const savedState = saveState(moveData);
            applyMove(moveData);
            const score = minimax(depth - 1, alpha, beta, false);
            restoreState(savedState);

            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const moveData of moves) {
            const savedState = saveState(moveData);
            applyMove(moveData);
            const score = minimax(depth - 1, alpha, beta, true);
            restoreState(savedState);

            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

// Evaluation simplifiee et rapide
function evaluateBoard() {
    let score = 0;

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = board[row][col];
            if (!piece) continue;

            // Valeur de base
            let pieceValue = piece.isKing ? 5 : 1;

            // Bonus de progression (pions seulement)
            if (!piece.isKing) {
                if (piece.color === 'white') {
                    pieceValue += (BOARD_SIZE - 1 - row) * 0.1;
                } else {
                    pieceValue += row * 0.1;
                }
            }

            // Bonus centre
            const centerDist = Math.abs(col - 4.5) + Math.abs(row - 4.5);
            pieceValue += (5 - centerDist) * 0.05;

            if (piece.color === 'white') {
                score += pieceValue;
            } else {
                score -= pieceValue;
            }
        }
    }

    return score;
}

function getAllMoves(color) {
    const allMoves = [];
    const captures = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const moves = [];
                const pieceCaptures = [];

                if (piece.isKing) {
                    getKingMoves(row, col, piece, moves, pieceCaptures);
                } else {
                    getPawnMoves(row, col, piece, moves, pieceCaptures);
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

    if (mandatoryCapture && captures.length > 0) {
        return captures;
    }

    return captures.length > 0 ? captures : allMoves;
}

function getPawnMoves(row, col, piece, moves, captures) {
    const directions = piece.color === 'black' ? [1] : [-1];
    const captureDirections = [1, -1];

    for (const dRow of directions) {
        for (const dCol of [-1, 1]) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (isValidPosition(newRow, newCol) && !board[newRow][newCol]) {
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

            if (isValidPosition(landRow, landCol)) {
                const capturedPiece = board[captureRow][captureCol];
                const landingCell = board[landRow][landCol];

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

function getKingMoves(row, col, piece, moves, captures) {
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

        while (isValidPosition(currentRow, currentCol)) {
            const currentPiece = board[currentRow][currentCol];

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

function isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}
