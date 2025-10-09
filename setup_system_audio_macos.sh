#!/bin/bash

# Setup System Audio Capture for macOS
# This script helps configure BlackHole and Multi-Output Device for system audio capture

echo "=============================================="
echo "System Audio Capture Setup for macOS"
echo "=============================================="
echo ""

# Check if BlackHole is installed
echo "Checking for BlackHole installation..."
if brew list blackhole-2ch &>/dev/null; then
    echo "✓ BlackHole 2ch is already installed"
else
    echo "❌ BlackHole 2ch is not installed"
    echo ""
    echo "Installing BlackHole 2ch..."
    brew install blackhole-2ch

    if [ $? -eq 0 ]; then
        echo "✓ BlackHole 2ch installed successfully"
    else
        echo "❌ Failed to install BlackHole 2ch"
        exit 1
    fi
fi

echo ""
echo "=============================================="
echo "MANUAL CONFIGURATION REQUIRED"
echo "=============================================="
echo ""
echo "To capture system audio, you need to create a Multi-Output Device:"
echo ""
echo "1. Open 'Audio MIDI Setup' application:"
echo "   - Press Cmd+Space and type 'Audio MIDI Setup'"
echo "   - Or open /Applications/Utilities/Audio MIDI Setup.app"
echo ""
echo "2. Create a Multi-Output Device:"
echo "   - Click the '+' button in the bottom-left corner"
echo "   - Select 'Create Multi-Output Device'"
echo ""
echo "3. Configure the Multi-Output Device:"
echo "   - Check BOTH boxes:"
echo "     ☑ BlackHole 2ch"
echo "     ☑ Your speakers (e.g., 'MacBook Pro Speakers' or external speakers)"
echo "   - This routes audio to BOTH BlackHole (for capture) AND your speakers (so you can hear)"
echo ""
echo "4. Set as System Output (Important!):"
echo "   - Right-click on the newly created 'Multi-Output Device'"
echo "   - Select 'Use This Device For Sound Output'"
echo "   - OR go to System Settings > Sound > Output and select 'Multi-Output Device'"
echo ""
echo "5. Verify ffmpeg can see BlackHole:"
echo "   - Run: ffmpeg -f avfoundation -list_devices true -i \"\""
echo "   - You should see 'BlackHole 2ch' in the audio devices list"
echo ""
echo "=============================================="
echo "CURRENT AUDIO DEVICES"
echo "=============================================="
echo ""
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -A 20 "AVFoundation audio devices"
echo ""
echo "=============================================="
echo "CONFIGURATION STATUS"
echo "=============================================="
echo ""

# Check current settings
if [ -f "backend/config/settings.py" ]; then
    echo "Current configuration in backend/config/settings.py:"
    echo ""
    grep -E "MICROPHONE_DEVICE|SYSTEM_AUDIO_DEVICE|ENABLE_SYSTEM_AUDIO" backend/config/settings.py
    echo ""
else
    echo "❌ Cannot find backend/config/settings.py"
fi

echo "=============================================="
echo "NEXT STEPS"
echo "=============================================="
echo ""
echo "1. Follow the manual configuration steps above to create Multi-Output Device"
echo "2. Make sure Multi-Output Device is set as your system output"
echo "3. Play some audio (music, video, etc.)"
echo "4. Run: ./start.sh"
echo "5. You should see both microphone and system audio being captured!"
echo ""
echo "If system audio is not working:"
echo "  - Verify Multi-Output Device is set as system output in Sound Settings"
echo "  - Ensure BlackHole 2ch is checked in the Multi-Output Device"
echo "  - Try running: ffmpeg -f avfoundation -i \":1\" -t 5 test.wav"
echo "    (This records 5 seconds from BlackHole to test.wav)"
echo ""
