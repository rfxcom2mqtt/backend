# RFXCOM2MQTT

[![RFXCOM](rfxcom.png)](http://www.rfxcom.com)

RFXCOM to MQTT bridge for RFXtrx433 devices

All received RFXCOM events are published to the MQTT rfxcom2mqtt/devices/\<id\> topic.
It is up to the MQTT receiver to filter these messages or to have a register/learning/pairing mechanism.

## [Getting started](./docs/README.md)

The [documentation](./docs/README.md) provides you all the information needed to get up and running! Make sure you don't skip sections if this is your first visit, as there might be important details in there for you.

## Usage

<img align="left" height="100px" width="100px" src="https://user-images.githubusercontent.com/7738048/40914297-49e6e560-6800-11e8-8904-36cce896e5a8.png">

### [Home Assistant Integration](./docs/usage/integrations/home_assistant.md)

The easiest way to integrate Rfxcom2MQTT with Home Assistant is by
using [MQTT discovery](https://www.home-assistant.io/integrations/mqtt#mqtt-discovery).
This allows Rfxcom2MQTT to automatically add devices to Home Assistant.

### Configuration

See example **config.yml**

### List of available commands

[DeviceCommands](https://github.com/rfxcom/node-rfxcom/blob/master/DeviceCommands.md)

### [MQTT Topics and Messages](./docs/usage/mqtt_topics_and_messages.md)

### Somfy RFY intégration

#### Home assistant configuration

Add this lines to /hass-config/configuration.yaml file.

``` YML
mqtt:
  cover:
    - name: "BSO Volet"
      command_topic: "rfxcom2mqtt/command/rfy/0x0B0003,0x020405,0x000006,0x000007"
      state_topic: "rfxcom2mqtt/command/rfy/0x0B0003,0x020405,0x000006,0x000007"
      availability:
        - topic: "rfxcom2mqtt/bridge/status"
      qos: 0
      retain: false
      payload_open: '{ "command": "up" }'
      payload_close: '{ "command": "down" }'
      payload_stop: '{ "command": "stop" }'
      state_open: "open"
      state_opening: "opening"
      state_closed: "closed"
      state_closing: "closing"
      payload_available: "online"
      payload_not_available: "offline"
      optimistic: false
      value_template: "{{ value.x }}"
      
    - name: "Salle de jeux Volet"
      command_topic: "rfxcom2mqtt/command/rfy/0x000002"
      state_topic: "rfxcom2mqtt/command/rfy/0x000002"
      availability:
        - topic: "rfxcom2mqtt/bridge/status"
      qos: 0
      retain: false
      payload_open: '{ "command": "up" }'
      payload_close: '{ "command": "down" }'
      payload_stop: '{ "command": "stop" }'
      state_open: "open"
      state_opening: "opening"
      state_closed: "closed"
      state_closing: "closing"
      payload_available: "online"
      payload_not_available: "offline"
      optimistic: false
      value_template: "{{ value.x }}"
```

#### MQTT trigger [[MQTT explorer]](https://mqtt-explorer.com/)

##### MQTT topic

* Topic by name: rfxcom2mqtt/command/rfy/Mezanine3
* Topic by id: rfxcom2mqtt/command/rfy/0x000003
* Topic by list of ids: rfxcom2mqtt/command/rfy/0x000001,0x000002,0x000003

##### MQTT body

``` MQTT
{
  "command": "up"
}
```

##### MQTT commands

* up
* down
* stop
* program

#### rfxcom2mqtt configuration (optional)

``` YML
devices:
  - id: '0x000003'
    name: 'Mezzanine3'
    friendlyName: 'Mezzanine 3'
    type: 'rfy' 
    subtype: 'RFY'
    blindsMode: 'EU'
```

#### Home assistant

### Healthcheck

If healthcheck is enabled in the config, the rfxcom status will checked every minute.
In case of an error the node process will exit.
If installed in docker the container will try to restart try to reconnect to the RFXCOM device.

----

## Dependencies

The [RFXCOM](https://github.com/rfxcom/node-rfxcom) Node library for the communication with the [RFXCOM](http://www.rfxcom.com) RFXtrx433 433.92MHz Transceiver.

The [MQTT.js](https://github.com/mqttjs/MQTT.js) library for sending and receiving MQTT messages.

## Development

``` Node
nvm install 18.18
nvm use 18.18
npm install

ts-node src/index.ts --env-file=.env
ts-node src/index.ts --env-file=.env.dev
ts-node src/index.ts --env-file=.env.yla
```

### Build docker image

Build a local image

```
docker-compose build
```

build multi Arch image

```
docker buildx build \ 
--platform linux/amd64,linux/arm/v7 \
--push \
-t rfxcom2mqtt/rfxcom2mqtt .
```