const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const drawingHistory = [];

const wordsList = [
  "Soleil",
  "Lune",
  "Nuage",
  "Pluie",
  "Neige",
  "Arbre",
  "Fleur",
  "Feuille",
  "Montagne",
  "Rivière",
  "Chat",
  "Chien",
  "Poisson",
  "Oiseau",
  "Lapin",
  "Grenouille",
  "Escargot",
  "Papillon",
  "Abeille",
  "Souris",
  "Pomme",
  "Banane",
  "Fraise",
  "Cerise",
  "Carotte",
  "Pain",
  "Gâteau",
  "Glace",
  "Pizza",
  "Fromage",
  "Ballon",
  "Livre",
  "Chaise",
  "Crayon",
  "Brosse",
  "Téléphone",
  "Clé",
  "Sac",
  "Tasse",
  "Horloge",
  "Voiture",
  "Vélo",
  "Bateau",
  "Avion",
  "Train",
  "Fusée",
  "Skateboard",
  "Montgolfière",
  "Camion",
  "Moto",
  "Sourire",
  "Tristesse",
  "Colère",
  "Étonnement",
  "Cœur",
  "Yeux",
  "Nez",
  "Bouche",
  "Larmes",
  "Bisou",
  "Lit",
  "Table",
  "Lampe",
  "Porte",
  "Fenêtre",
  "Télévision",
  "Réfrigérateur",
  "Four",
  "Tapis",
  "Rideaux",
  "Cadeau",
  "Gâteau",
  "Bougie",
  "Sapin",
  "Bonhomme de neige",
  "Feu d’artifice",
  "Confettis",
  "Chapeau de fête",
  "Œuf de Pâques",
  "Citrouille",
  "Brosse à dents",
  "Dent",
  "Savon",
  "Étoile",
  "Chapeau",
  "Chaussure",
  "Botte",
  "Gant",
  "Écharpe",
  "Veste",
  "Bulle",
  "Carte",
  "Carte au trésor",
  "Trèfle",
  "Feu",
  "Tornade",
  "Igloo",
  "Igloo",
  "Globe",
  "Bocal",
  "Ananas",
  "Pastèque",
  "Raisin",
  "Orange",
  "Poire",
  "Citron",
  "Brocoli",
  "Maïs",
  "Laitue",
  "Tomate",
  "Ciseaux",
  "Colle",
  "Règle",
  "Trombone",
  "Ordinateur",
  "Tablette",
  "Télécommande",
  "Ventilateur",
  "Parapluie",
  "Cadenas",
  "Bague",
  "Collier",
  "Bracelet",
  "Montre",
  "Couronne",
  "Masque",
  "Marteau",
  "Tournevis",
  "Clou",
  "Clé anglaise",
  "Dinosaure",
  "Dragon",
  "Licorne",
  "Fantôme",
  "Zombi",
  "Robot",
  "Alien",
  "Monstre",
  "Sorcière",
  "Magicien",
  "Château",
  "Pont",
  "Tour",
  "Maison",
  "Igloo",
  "Cabane",
  "Tente",
  "Caverne",
  "Phare",
  "Pyramide",
  "Plage",
  "Coquillage",
  "Crabe",
  "Sable",
  "Vague",
  "Serviette",
  "Lunettes de soleil",
  "Seau",
  "Pelle",
  "Château de sable",
  "Zèbre",
  "Tigre",
  "Lion",
  "Éléphant",
  "Girafe",
  "Crocodile",
  "Singe",
  "Panda",
  "Ours",
  "Koala",
  "Tambour",
  "Guitare",
  "Piano",
  "Trompette",
  "Violon",
  "Micro",
  "Casque audio",
  "Note de musique",
  "Disque",
  "Radio",
];

let gameState = {
  players: new Map(),
  currentDrawer: null,
  currentWord: null,
  gameActive: false,
  roundTimer: null,
  roundDuration: 60000,
  scores: new Map(),
  waitingForNextRound: false,
};

function startNewRound() {
  const playerIds = Array.from(gameState.players.keys());

  if (playerIds.length < 2) {
    gameState.gameActive = false;
    io.emit("gameStatus", {
      active: false,
      message: "Il faut au moins 2 joueurs pour commencer le jeu",
    });
    return;
  }

  let availableDrawers = playerIds.filter(
    (id) => id !== gameState.currentDrawer
  );
  if (availableDrawers.length === 0) availableDrawers = playerIds;

  gameState.currentDrawer =
    availableDrawers[Math.floor(Math.random() * availableDrawers.length)];
  gameState.currentWord =
    wordsList[Math.floor(Math.random() * wordsList.length)];
  gameState.gameActive = true;
  gameState.waitingForNextRound = false;

  drawingHistory.length = 0;
  io.emit("clear");

  io.emit("newRound", {
    drawerId: gameState.currentDrawer,
    drawerName:
      gameState.players.get(gameState.currentDrawer)?.name || "Joueur",
    isDrawing: false,
  });

  io.to(gameState.currentDrawer).emit("wordToDrawr", {
    word: gameState.currentWord,
    isDrawer: true,
  });

  if (gameState.roundTimer) clearTimeout(gameState.roundTimer);
  gameState.roundTimer = setTimeout(() => {
    endRound("timeout");
  }, gameState.roundDuration);
}

function endRound(reason) {
  if (gameState.roundTimer) {
    clearTimeout(gameState.roundTimer);
    gameState.roundTimer = null;
  }

  gameState.gameActive = false;
  gameState.waitingForNextRound = true;

  // Si quelqu'un a trouvé, donner des points au dessinateur aussi
  if (reason === "guessed" && gameState.currentDrawer) {
    const drawer = gameState.players.get(gameState.currentDrawer);
    if (drawer) {
      drawer.score += 5;
      console.log(
        `🎨 ${drawer.name} (dessinateur) gagne 5 points ! Score: ${drawer.score}`
      );
    }
  }

  io.emit("roundEnd", {
    reason: reason,
    word: gameState.currentWord,
    scores: Array.from(gameState.players.entries()).map(([id, player]) => ({
      name: player.name,
      score: player.score,
    })),
    waitingForNext: true,
  });
}

io.on("connection", (socket) => {
  socket.emit("initCanvas", drawingHistory);

  socket.on("joinGame", (playerName) => {
    const player = {
      id: socket.id,
      name: playerName || `Joueur${gameState.players.size + 1}`,
      score: 0,
    };

    gameState.players.set(socket.id, player);

    io.emit("playersUpdate", {
      players: Array.from(gameState.players.values()),
      currentDrawer: gameState.currentDrawer,
    });

    if (gameState.players.size >= 2 && !gameState.gameActive) {
      io.emit("canStartGame", { canStart: true });
    }
  });

  socket.on("startGame", () => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    if (gameState.players.size >= 2 && !gameState.gameActive) {
      io.emit("gameStarted", {
        playerName: player.name,
      });

      setTimeout(() => {
        startNewRound();
      }, 1000);
    }
  });

  // Fonction pour calculer la distance de Levenshtein
  function levenshteinDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  socket.on("chatMessage", (message) => {
    const player = gameState.players.get(socket.id);
    if (!player || !gameState.gameActive) return;

    if (socket.id === gameState.currentDrawer) {
      socket.emit("chatResponse", {
        type: "error",
        message: "Vous ne pouvez pas deviner votre propre mot !",
      });
      return;
    }

    const userMessage = message.toLowerCase().trim();
    const targetWord = gameState.currentWord.toLowerCase();

    if (userMessage === targetWord) {
      // Bonne réponse !
      player.score += 10;

      // Émettre le message de chat avec la bonne réponse
      io.emit("chatMessage", {
        playerName: player.name,
        message: message,
        isCorrect: true,
      });

      // Émettre un événement spécial pour la victoire avec tous les détails
      io.emit("correctGuess", {
        playerName: player.name,
        word: gameState.currentWord,
        score: player.score,
        winnerId: socket.id,
      });

      console.log(
        `🎉 ${player.name} a trouvé "${gameState.currentWord}" ! Score: ${player.score}`
      );

      // Terminer la manche
      endRound("guessed");
    } else {
      // Vérifier si le mot est proche (1-2 lettres de différence)
      const distance = levenshteinDistance(userMessage, targetWord);
      const wordLength = Math.max(userMessage.length, targetWord.length);

      const isClose =
        (wordLength >= 4 && distance <= 2) ||
        (wordLength < 4 && distance === 1);

      if (isClose) {
        // Envoyer un message "presque" seulement au joueur qui a écrit
        socket.emit("almostCorrect", {
          message: "🔥 Presque ! Tu y es presque !",
        });
      }

      // Diffuser le message à tous (même si c'est proche)
      io.emit("chatMessage", {
        playerName: player.name,
        message: message,
        isCorrect: false,
      });
    }
  });

  socket.on("startNextRound", () => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    if (gameState.waitingForNextRound && gameState.players.size >= 2) {
      io.emit("nextRoundStarted", {
        playerName: player.name,
      });

      setTimeout(() => {
        startNewRound();
      }, 1000);
    }
  });

  socket.on("draw", (data) => {
    if (socket.id === gameState.currentDrawer && gameState.gameActive) {
      drawingHistory.push({ type: "draw", data });
      socket.broadcast.emit("draw", data);
    }
  });

  socket.on("draw_line", (data) => {
    if (socket.id === gameState.currentDrawer && gameState.gameActive) {
      drawingHistory.push({ type: "draw_line", data });
      socket.broadcast.emit("draw_line", data);
    }
  });

  socket.on("clear", () => {
    if (socket.id === gameState.currentDrawer && gameState.gameActive) {
      drawingHistory.length = 0;
      io.emit("clear");
    }
  });

  socket.on("disconnect", () => {
    const player = gameState.players.get(socket.id);
    if (player) {
      gameState.players.delete(socket.id);

      if (socket.id === gameState.currentDrawer) {
        endRound("disconnected");
      }

      io.emit("playersUpdate", {
        players: Array.from(gameState.players.values()),
        currentDrawer: gameState.currentDrawer,
      });

      if (gameState.players.size < 2 && gameState.gameActive) {
        gameState.gameActive = false;
        if (gameState.roundTimer) {
          clearTimeout(gameState.roundTimer);
          gameState.roundTimer = null;
        }
        io.emit("gameStatus", {
          active: false,
          message: "Il faut au moins 2 joueurs pour continuer le jeu",
        });
      }

      if (gameState.players.size < 2 && !gameState.gameActive) {
        io.emit("canStartGame", { canStart: false });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
});
