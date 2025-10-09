#!/bin/bash

echo "========================================================================"
echo "System Audio Capture Setup Assistant"
echo "========================================================================"
echo ""

# Check if BlackHole is installed
if brew list blackhole-2ch &> /dev/null; then
    echo "✅ BlackHole 2ch is installed"
else
    echo "❌ BlackHole 2ch is NOT installed"
    echo ""
    read -p "Install BlackHole now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        brew install blackhole-2ch
        echo ""
        echo "⚠️  IMPORTANT: You must RESTART your Mac for BlackHole to work!"
        echo "   Run: sudo shutdown -r now"
        exit 0
    else
        echo "Cannot proceed without BlackHole. Exiting."
        exit 1
    fi
fi

echo ""
echo "Checking for BlackHole in audio devices..."
echo ""

# Check if BlackHole shows up in ffmpeg
if ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -qi "blackhole"; then
    echo "✅ BlackHole detected in audio devices"

    # Extract BlackHole index
    BLACKHOLE_INDEX=$(ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -i "blackhole" | grep -oE '\[[0-9]+\]' | grep -oE '[0-9]+')

    echo ""
    echo "Found BlackHole at index: [$BLACKHOLE_INDEX]"
    echo ""
    echo "Your audio devices:"
    ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -E "\[[0-9]+\]" | grep -v "indev"

else
    echo "❌ BlackHole NOT detected in audio devices"
    echo ""
    echo "This usually means one of:"
    echo "  1. You need to RESTART your Mac (required after installing BlackHole)"
    echo "  2. You need to create a Multi-Output Device first"
    echo ""
    echo "NEXT STEPS:"
    echo ""
    echo "1. Open 'Audio MIDI Setup' (Cmd+Space, type 'Audio MIDI Setup')"
    echo "2. Click the '+' button (bottom left) → 'Create Multi-Output Device'"
    echo "3. Check these boxes:"
    echo "   ✅ MacBook Pro Speakers"
    echo "   ✅ BlackHole 2ch"
    echo "4. Name it: 'Speakers + BlackHole'"
    echo "5. System Settings → Sound → Output → Select 'Speakers + BlackHole'"
    echo ""
    echo "Then run this script again."
    echo ""
    read -p "Have you done this? Press any key after setup or Ctrl+C to exit..."
    echo ""

    # Check again
    if ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -qi "blackhole"; then
        BLACKHOLE_INDEX=$(ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -i "blackhole" | grep -oE '\[[0-9]+\]' | grep -oE '[0-9]+')
        echo "✅ BlackHole now detected at index: [$BLACKHOLE_INDEX]"
    else
        echo "❌ Still not detecting BlackHole. You may need to restart your Mac."
        exit 1
    fi
fi

# Get microphone index
MIC_INDEX=$(ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -i "MacBook Pro Microphone" | grep -oE '\[[0-9]+\]' | grep -oE '[0-9]+')

echo ""
echo "========================================================================"
echo "Configuration Summary"
echo "========================================================================"
echo ""
echo "Microphone: [:$MIC_INDEX] MacBook Pro Microphone"
echo "System Audio: [:$BLACKHOLE_INDEX] BlackHole 2ch"
echo ""

# Update settings.py
SETTINGS_FILE="backend/config/settings.py"

if [ -f "$SETTINGS_FILE" ]; then
    echo "Updating $SETTINGS_FILE..."

    # Backup original
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup"

    # Update settings
    sed -i '' "s/^MICROPHONE_DEVICE = .*/MICROPHONE_DEVICE = \":$MIC_INDEX\"/" "$SETTINGS_FILE"
    sed -i '' "s/^SYSTEM_AUDIO_DEVICE = .*/SYSTEM_AUDIO_DEVICE = \":$BLACKHOLE_INDEX\"/" "$SETTINGS_FILE"
    sed -i '' "s/^ENABLE_SYSTEM_AUDIO = .*/ENABLE_SYSTEM_AUDIO = True/" "$SETTINGS_FILE"

    echo "✅ Configuration updated!"
    echo ""
    echo "Changes made:"
    grep -E "^(MICROPHONE_DEVICE|SYSTEM_AUDIO_DEVICE|ENABLE_SYSTEM_AUDIO)" "$SETTINGS_FILE"
else
    echo "❌ Could not find $SETTINGS_FILE"
    exit 1
fi

echo ""
echo "========================================================================"
echo "Setup Complete!"
echo "========================================================================"
echo ""
echo "IMPORTANT CHECKLIST:"
echo "  ✅ BlackHole installed"
echo "  ✅ Multi-Output Device created (Speakers + BlackHole)"
echo "  ✅ System output set to 'Speakers + BlackHole'"
echo "  ✅ Backend configuration updated"
echo ""
echo "Next steps:"
echo "  1. Make sure your System Sound output is set to 'Speakers + BlackHole'"
echo "  2. Start the system: ./start.sh"
echo "  3. Play a YouTube video and speak into your microphone"
echo "  4. Open http://localhost:8000"
echo "  5. You should see:"
echo "     🎤 Your voice (gray background)"
echo "     🖥️ YouTube audio (blue background)"
echo ""
echo "To verify system output:"
echo "  - Hold Option + Click speaker icon in menu bar"
echo "  - Make sure 'Speakers + BlackHole' is selected"
echo ""
