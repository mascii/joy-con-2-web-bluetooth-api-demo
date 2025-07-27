# Joy-Con 2 + Web Bluetooth API Demo

## Browser Requirements

This application uses the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), so please use one of the following browsers:

- Google Chrome
- Microsoft Edge
- [Bluefy - Web BLE Browser](https://apps.apple.com/jp/app/bluefy-web-ble-browser/id1492822055) (for iOS and iPadOS)

## How to Connect Joy-Con 2

1. **Click the "Connect L" or "Connect R" button**

   - A device selection dialog will appear.

2. **Activate pairing mode**

   - Press the **sync button** on your Joy-Con 2 to put it into pairing mode.

3. **Pair the device**
   - When a device appears in the dialog (it may be displayed as **"Joy-Con 2 (R)"** or **"DeviceName"**), select it and click the Pair button.
     - Pairing is only possible while the LED indicator lights on the controller are blinking.

## How to Disconnect

Reloading the page will disconnect all paired controllers.

## Special Thanks

The following repositories were used for reference:

- https://github.com/TheFrano/joycon2cpp
- https://github.com/moutella/joycon2mouse
