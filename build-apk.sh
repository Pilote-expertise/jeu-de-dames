#!/bin/bash

# Script de construction de l'APK Jeu de Dames
# =============================================

echo "🎮 Construction de l'APK Jeu de Dames"
echo "======================================"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si on est dans le bon dossier
if [ ! -f "capacitor.config.json" ]; then
    echo -e "${RED}❌ Erreur: Exécutez ce script depuis le dossier 'Jeu de dame'${NC}"
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

# Vérifier si le dossier android existe
if [ ! -d "android" ]; then
    echo -e "${YELLOW}📱 Création du projet Android...${NC}"
    npx cap add android
fi

# Synchroniser les fichiers web
echo -e "${YELLOW}🔄 Synchronisation des fichiers web...${NC}"

# Copier les fichiers mis à jour
cp index.html www/
cp styles.css www/
cp game.js www/
cp manifest.json www/
cp -r icons www/ 2>/dev/null

# Sync Capacitor
npx cap sync android

echo -e "${GREEN}✅ Fichiers synchronisés${NC}"

# Vérifier si ANDROID_HOME est défini
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  ANDROID_HOME n'est pas défini${NC}"
    echo ""
    echo "Pour construire l'APK, vous avez deux options :"
    echo ""
    echo "Option 1 : Ouvrir dans Android Studio"
    echo "  npx cap open android"
    echo ""
    echo "Option 2 : Définir ANDROID_HOME et relancer"
    echo "  export ANDROID_HOME=/chemin/vers/Android/Sdk"
    echo "  ./build-apk.sh"
    echo ""
    exit 0
fi

# Construire l'APK
echo -e "${YELLOW}🔨 Construction de l'APK...${NC}"
cd android

if [ -f "./gradlew" ]; then
    chmod +x ./gradlew
    ./gradlew assembleDebug

    if [ $? -eq 0 ]; then
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
        if [ -f "$APK_PATH" ]; then
            echo ""
            echo -e "${GREEN}✅ APK créé avec succès !${NC}"
            echo ""
            echo "📁 Emplacement : android/$APK_PATH"
            echo ""

            # Copier l'APK à la racine pour plus de facilité
            cp "$APK_PATH" "../JeuDeDames.apk"
            echo "📱 Copié vers : JeuDeDames.apk"
        fi
    else
        echo -e "${RED}❌ Erreur lors de la construction${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ gradlew non trouvé${NC}"
    exit 1
fi

echo ""
echo "🎉 Terminé ! Transférez JeuDeDames.apk sur votre téléphone pour l'installer."
