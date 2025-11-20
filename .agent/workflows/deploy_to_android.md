---
description: How to deploy the app to an Android device
---

1.  **Build the Web App**:
    First, you need to build the React application into static files.
    ```bash
    npm run build
    ```

2.  **Sync with Capacitor**:
    This copies the built web assets to the native Android project.
    ```bash
    npx cap sync
    ```

3.  **Open in Android Studio**:
    This command opens the `android` folder in Android Studio.
    ```bash
    npx cap open android
    ```

4.  **Run on Device**:
    - Connect your Android phone via USB.
    - Enable **USB Debugging** in your phone's Developer Options.
    - In Android Studio, select your connected device from the device dropdown (top toolbar).
    - Click the **Run** button (green play icon) or press `Shift + F10`.

> [!TIP]
> You don't need to commit to GitHub just to test locally. You can do it directly from your current folder.
