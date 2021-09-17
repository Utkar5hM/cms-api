/* eslint-disable no-underscore-dangle */
const { cloudinary } = require('../services/cloudinary');

const Event = require('../models/event');
const Organization = require('../models/organization');
const Award = require('../models/award');
const User = require('../models/user');
/*  to get all the events of the organizations  a
 seperate get req will be made for all the events happening */

module.exports.organizationIndex = async (req, res) => {
  const currentOrganization = await Organization.findOne({
    organizationId: req.params.organizationId,
  });
  const activeEvents = await Event.find({
    organization: currentOrganization._id,
    active: true,
  });
  const completedEvents = await Event.find({
    organization: currentOrganization._id,
    active: false,
  });
  res.json({
    success: true,
    activeEvents,
    completedEvents,
  });
};

module.exports.index = async (req, res) => {
  const activeEvents = await Event.find({
    active: true,
  });
  const completedEvents = await Event.find({
    active: false,
  });
  res.json({
    success: true,
    activeEvents,
    completedEvents,
  });
};
module.exports.createEvent = async (req, res) => {
  const organization = await Organization.findOne({
    organizationId: req.params.organizationId,
  });
  const {
    name,
    eventId,
    externalUrl,
    tags,
    bio,
    about,
    startDate,
    endDate,
    active,
  } = req.body.event;
  const event = new Event({
    name,
    eventId,
    externalUrl,
    tags,
    bio,
    about,
    startDate,
    endDate,
    active,
  });
  if (req.files.logo[0]) {
    event.logo = {
      url: req.files.logo[0].path,
      filename: req.files.logo[0].filename,
    };
  }
  if (req.files.bannerImage[0]) {
    event.bannerImage = {
      url: req.files.logo[0].path,
      filename: req.files.logo[0].filename,
    };
  }
  event.organization = organization._id;
  await event.save();
  organization.events.push(event._id);
  await organization.save();
  res.json({ success: true, event });
  /* res.redirect(`/organizations/${req.params.organizationId}/events/${eventId}/`) */
};
module.exports.showEvent = async (req, res, next) => {
  const event = await Event.findOne({ eventId: req.params.eventId }).populate(
    'organization',
  );
  /* populate other according to needs */
  if (!event) {
    const err = { message: 'event not found', statusCode: 404 };
    next(err);
    // res.redirect(`/organizations/${req.params.organizationId}/`)
  }
  res.json({ success: true, event });
};

module.exports.editEvent = async (req, res) => {
  const event = await Event.findOneAndUpdate(
    { eventId: req.params.eventId },
    { ...req.body.event },
  );
  if (req.files.logo[0]) {
    await cloudinary.uploader.destroy(event.logo.filename);
    event.logo = {
      url: req.files.logo[0].path,
      filename: req.files.logo[0].filename,
    };
  }
  if (req.files.bannerImage[0]) {
    await cloudinary.uploader.destroy(event.bannerImage.filename);
    event.bannerImage = {
      url: req.files.logo[0].path,
      filename: req.files.logo[0].filename,
    };
  }
  await event.save();
  res.json({ success: true, event });
};

module.exports.deleteEvent = async (req, res) => {
  const event = await Event.findOne({ eventId: req.params.eventId });
  await Organization.findByIdAndUpdate(event.Organization, {
    $pull: { events: event._id },
  });
  /* Award deletion commands here */
  await User.updateMany({}, { $pull: { awards: event.awards } });
  await Award.deleteMany({ $in: { _id: event.awards } });
  await cloudinary.uploader.destroy(event.bannerImage.filename);
  await cloudinary.uploader.destroy(event.logo.filename);
  await event.findByIdAndDelete(event._id);
  res.json({ success: true, message: 'Event Deleted Successfully' });
};

module.exports.register = async (req, res) => {
  const event = await Event.findOne({ eventId: req.params.eventId });
  event.participants.push(req.user._id);
  await event.save();
  const user = User.findById(req.user._id);
  user.events.push(event._id);
  await user.save();
  res.json({ sucess: true, message: 'Registered for the event Successfully.' });
};

module.exports.deregister = async (req, res) => {
  const event = await Event.findOneAndUpdate({ eventId: req.params.eventId },
    { $pull: { user: req.user._id } });
  await User.findOneAndUpdate({ _id: req.user._id }, { $pull: { events: event._id } });
  res.json({ sucess: true, message: 'Deregistered from the event successfully.' });
};
