# Comment créer l'APK du Jeu de Dames

## Méthode 1 : Avec Android Studio (Recommandé)

### Étape 1 : Installer Android Studio
1. Téléchargez Android Studio : https://developer.android.com/studio
2. Installez-le et lancez-le
3. Lors du premier lancement, installez le SDK Android (API 33 ou supérieur)

### Étape 2 : Générer les icônes
1. Ouvrez le fichier `generate-icons.html` dans votre navigateur
2. Cliquez sur "Générer toutes les icônes"
3. Téléchargez chaque icône et placez-les dans le dossier `icons/`

### Étape 3 : Ouvrir le projet dans Android Studio
1. Ouvrez un terminal dans le dossier du projet
2. Exécutez : `npx cap open android`
3. Android Studio s'ouvre avec le projet

### Étape 4 : Configurer les icônes dans Android Studio
1. Faites un clic droit sur `app` → `New` → `Image Asset`
2. Sélectionnez l'icône `icon-512.png` comme source
3. Générez les icônes adaptatives

### Étape 5 : Construire l'APK
1. Menu `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. L'APK sera généré dans : `android/app/build/outputs/apk/debug/app-debug.apk`

### Étape 6 : Installer sur téléphone
1. Copiez l'APK sur votre téléphone
2. Activez "Sources inconnues" dans les paramètres Android
3. Ouvrez l'APK et installez

---

## Méthode 2 : En ligne de commande (Linux/Mac)

### Prérequis
- Java JDK 17+ installé
- Android SDK installé
- Variable ANDROID_HOME configurée

### Commandes
```bash
# Synchroniser le projet
cd "/home/doyen/Jeu de dame"
npx cap sync android

# Construire l'APK debug
cd android
./gradlew assembleDebug

# L'APK est dans : app/build/outputs/apk/debug/app-debug.apk
```

### Pour un APK release (signé)
```bash
./gradlew assembleRelease
```
Note: Vous aurez besoin d'un keystore pour signer l'APK release.

---

## Méthode 3 : Service en ligne (Sans installation)

### Option A : Utiliser AppGyver/Voltbuilder
1. Allez sur https://volt.build/
2. Créez un compte gratuit
3. Uploadez le dossier `www/` en ZIP
4. Configurez et construisez l'APK

### Option B : Utiliser PWABuilder
1. Hébergez votre jeu sur un serveur web (GitHub Pages, Netlify, etc.)
2. Allez sur https://www.pwabuilder.com/
3. Entrez l'URL de votre jeu
4. Générez l'APK Android

---

## Structure du projet

```
Jeu de dame/
├── www/                    # Fichiers web (copiés automatiquement)
│   ├── index.html
│   ├── styles.css
│   ├── game.js
│   └── manifest.json
├── android/                # Projet Android natif
│   ├── app/
│   │   └── src/main/
│   │       ├── assets/     # Fichiers web copiés ici
│   │       └── res/        # Ressources Android (icônes)
│   └── gradlew             # Script de build
├── icons/                  # Icônes source
├── package.json
├── capacitor.config.json
└── generate-icons.html     # Générateur d'icônes
```

---

## Dépannage

### "SDK location not found"
Créez un fichier `android/local.properties` avec :
```
sdk.dir=/chemin/vers/Android/Sdk
```

### "Gradle build failed"
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### L'APK ne s'installe pas
- Vérifiez que "Sources inconnues" est activé
- Sur Android 8+, autorisez l'installation depuis votre gestionnaire de fichiers

---

## Commandes utiles

```bash
# Synchroniser après modification des fichiers web
npx cap sync

# Ouvrir dans Android Studio
npx cap open android

# Lancer sur un appareil connecté
npx cap run android

# Voir les logs
npx cap run android -l
```
