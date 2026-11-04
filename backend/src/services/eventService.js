const EventLog = require('../models/EventLog');

let ioInstance = null;

function setEventIo(io) {
  ioInstance = io;
}

async function createEvent({ category, description, source, employeeRef = null, severity = 'INFO', metadata = {} }) {
  try {
    const event = await EventLog.create({
      category,
      description,
      source,
      employeeRef,
      severity,
      metadata,
      timestamp: new Date(),
    });

    if (employeeRef) {
      await event.populate('employeeRef', 'name employeeId role');
    }

    if (ioInstance) {
      ioInstance.emit('event:new', event);
    }

    return event;
  } catch (error) {
    console.error(`[EventService] Error logging event: ${error.message}`);
    return null;
  }
}

module.exports = {
  setEventIo,
  createEvent,
};

