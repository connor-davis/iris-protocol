const b4a = require("b4a");
const Constants = require("../constants");

class IrisProtocolPacket {
  static create(type, data = {}) {
    const packetType = Buffer.alloc(type.length).fill(type).toString("hex");
    const packetData = Buffer.alloc(JSON.stringify(data).length)
      .fill(JSON.stringify(data))
      .toString("hex");
    const packet = `${packetType}:${packetData}`;

    return packet;
  }

  static read(packet) {
    const packetParts = packet.toString().split(":");

    const packetType = this.validatePacketType(
      b4a.toString(b4a.from(packetParts[0], "hex"), "utf-8")
    );
    const packetData = this.validatePacketData(
      b4a.toString(b4a.from(packetParts[1], "hex"), "utf-8")
    );

    return {
      type: packetType,
      data: packetData || {},
    };
  }

  static validatePacketType(packetType) {
    return Object.values(Constants).includes(packetType)
      ? packetType
      : Constants.UNKNOWN_PACKET;
  }

  static validatePacketData(packetData) {
    try {
      return JSON.parse(packetData);
    } catch (error) {
      return {};
    }
  }
}

module.exports = IrisProtocolPacket;
