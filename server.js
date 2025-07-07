const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, "public")));

// Route principale
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const drawingHistory = [];

// Liste de mots à deviner
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

// État du jeu
let gameState = {
  players: new Map(), // socketId -> {id, name, score}
  currentDrawer: null,
  currentWord: null,
  gameActive: false,
  roundTimer: null,
  roundDuration: 60000, // 60 secondes par tour
  scores: new Map(),
  waitingForNextRound: false, // Nouveau: indique si on attend qu'un joueur lance la prochaine manche
};

// Fonction pour démarrer une nouvelle manche
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

  // Sélectionner un nouveau dessinateur (différent du précédent si possible)
  let availableDrawers = playerIds.filter(
    (id) => id !== gameState.currentDrawer
  );
  if (availableDrawers.length === 0) availableDrawers = playerIds;

  gameState.currentDrawer =
    availableDrawers[Math.floor(Math.random() * availableDrawers.length)];
  gameState.currentWord =
    wordsList[Math.floor(Math.random() * wordsList.length)];
  gameState.gameActive = true;
  gameState.waitingForNextRound = false; // Reset du flag d'attente

  // Effacer le canvas pour la nouvelle manche
  drawingHistory.length = 0;
  io.emit("clear");

  // Informer tous les joueurs du nouveau tour
  io.emit("newRound", {
    drawerId: gameState.currentDrawer,
    drawerName:
      gameState.players.get(gameState.currentDrawer)?.name || "Joueur",
    isDrawing: false, // Par défaut, personne ne dessine
  });

  // Envoyer le mot seulement au dessinateur
  io.to(gameState.currentDrawer).emit("wordToDrawr", {
    word: gameState.currentWord,
    isDrawer: true,
  });

  // Démarrer le timer du tour
  if (gameState.roundTimer) clearTimeout(gameState.roundTimer);
  gameState.roundTimer = setTimeout(() => {
    endRound("timeout");
  }, gameState.roundDuration);

  console.log(
    `🎮 Nouvelle manche: ${
      gameState.players.get(gameState.currentDrawer)?.name
    } dessine "${gameState.currentWord}"`
  );
}

// Fonction pour terminer une manche
function endRound(reason) {
  if (gameState.roundTimer) {
    clearTimeout(gameState.roundTimer);
    gameState.roundTimer = null;
  }

  gameState.gameActive = false;
  gameState.waitingForNextRound = true;

  io.emit("roundEnd", {
    reason: reason,
    word: gameState.currentWord,
    scores: Array.from(gameState.players.entries()).map(([id, player]) => ({
      name: player.name,
      score: player.score,
    })),
    waitingForNext: true, // Indique qu'on attend l'action d'un joueur
  });

  // Ne plus démarrer automatiquement la prochaine manche
  // setTimeout(() => {
  //   startNewRound();
  // }, 3000);
}

io.on("connection", (socket) => {
  console.log("🟢 Un utilisateur est connecté");

  socket.emit("initCanvas", drawingHistory);

  // Gestion de l'inscription d'un joueur
  socket.on("joinGame", (playerName) => {
    const player = {
      id: socket.id,
      name: playerName || `Joueur${gameState.players.size + 1}`,
      score: 0,
    };

    gameState.players.set(socket.id, player);

    console.log(`👤 ${player.name} a rejoint le jeu`);

    // Informer tous les joueurs de la liste mise à jour
    io.emit("playersUpdate", {
      players: Array.from(gameState.players.values()),
      currentDrawer: gameState.currentDrawer,
    });

    // Démarrer le jeu si on a au moins 2 joueurs et que le jeu n'est pas actif
    if (gameState.players.size >= 2 && !gameState.gameActive) {
      setTimeout(() => startNewRound(), 1000);
    }
  });

  // Gestion des messages de chat (pour deviner)
  socket.on("chatMessage", (message) => {
    const player = gameState.players.get(socket.id);
    if (!player || !gameState.gameActive) return;

    // Si c'est le dessinateur, ne pas traiter le message
    if (socket.id === gameState.currentDrawer) {
      socket.emit("chatResponse", {
        type: "error",
        message: "Vous ne pouvez pas deviner votre propre mot !",
      });
      return;
    }

    // Vérifier si le message correspond au mot à deviner
    if (message.toLowerCase().trim() === gameState.currentWord.toLowerCase()) {
      // Bonne réponse !
      player.score += 10;

      io.emit("chatMessage", {
        playerName: player.name,
        message: message,
        isCorrect: true,
      });

      io.emit("correctGuess", {
        playerName: player.name,
        word: gameState.currentWord,
        score: player.score,
      });

      // Terminer la manche
      endRound("guessed");
    } else {
      // Mauvaise réponse, diffuser le message
      io.emit("chatMessage", {
        playerName: player.name,
        message: message,
        isCorrect: false,
      });
    }
  });

  // Gestion du bouton "Prochaine manche"
  socket.on("startNextRound", () => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    // Vérifier si on est bien en attente d'une nouvelle manche
    if (gameState.waitingForNextRound && gameState.players.size >= 2) {
      console.log(`🎮 ${player.name} a lancé la prochaine manche`);

      // Informer tous les joueurs qui a lancé la manche
      io.emit("nextRoundStarted", {
        playerName: player.name,
      });

      // Démarrer la nouvelle manche après un petit délai
      setTimeout(() => {
        startNewRound();
      }, 1000);
    }
  });

  socket.on("draw", (data) => {
    // Seul le dessinateur peut dessiner
    if (socket.id === gameState.currentDrawer && gameState.gameActive) {
      drawingHistory.push({ type: "draw", data });
      socket.broadcast.emit("draw", data);
    }
  });

  socket.on("draw_line", (data) => {
    // Seul le dessinateur peut dessiner
    if (socket.id === gameState.currentDrawer && gameState.gameActive) {
      drawingHistory.push({ type: "draw_line", data });
      socket.broadcast.emit("draw_line", data);
    }
  });

  socket.on("clear", () => {
    // Seul le dessinateur peut effacer
    if (socket.id === gameState.currentDrawer && gameState.gameActive) {
      drawingHistory.length = 0;
      io.emit("clear");
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Un utilisateur est déconnecté");

    const player = gameState.players.get(socket.id);
    if (player) {
      console.log(`👤 ${player.name} a quitté le jeu`);
      gameState.players.delete(socket.id);

      // Si c'était le dessinateur, terminer la manche
      if (socket.id === gameState.currentDrawer) {
        endRound("disconnected");
      }

      // Informer les autres joueurs
      io.emit("playersUpdate", {
        players: Array.from(gameState.players.values()),
        currentDrawer: gameState.currentDrawer,
      });

      // Arrêter le jeu s'il n'y a plus assez de joueurs
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
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
});
