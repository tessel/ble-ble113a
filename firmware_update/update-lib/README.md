###Beware

If updating the BLE module goes wrong and the script aborts prior to completion, it's possible (and probable) that you won't be able to use the module again without buying more hardware (namely, a CC debugger and a windows machine).

###Process
To use the update process, you must have access to the generated hex file from the BlueGiga Software Update Tool (only runs on Windows). Either use the latest build from this repo or generate your own firmware using their tool.

Then, run the hex_to_buffer.py script with the name of hex file as the first argument. This script parses an intel hex file and extracts only the data into a file.

Then, in the directory above, `tessel run ble-update-tool.js` in order to open that new image, put the BLE module into DFU mode, and load the new firmware. This process takes a couple minutes. 

Once that completes, the firmware should be updated.