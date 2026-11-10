// models/index.js - Tailored for bundling
'use strict';

const Sequelize = require('sequelize');
const process = require('process');
const config = require(__dirname + '/../config/config.js')[process.env.NODE_ENV || 'development'];

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Explicitly require each model.
// This is safer for bundlers as they can statically analyze these requires.
// If your models directory is huge, this can be cumbersome,
// but for a typical number of models, it's robust.
db.Office = require('./office')(sequelize, Sequelize.DataTypes);
db.KioskRating = require('./kioskRating')(sequelize, Sequelize.DataTypes);
db.Rating = require('./rating')(sequelize, Sequelize.DataTypes);
db.Complaint = require('./complaint')(sequelize, Sequelize.DataTypes);
db.ComplaintHistory = require('./complaintHistory')(sequelize, Sequelize.DataTypes);
db.ComplaintDetail = require('./complaintDetail')(sequelize, Sequelize.DataTypes);
db.ComplaintFile = require('./complaintFile')(sequelize, Sequelize.DataTypes);
db.ComplaintOffice = require('./complaintOffice')(sequelize, Sequelize.DataTypes);
db.ComplaintType = require('./complaintType')(sequelize, Sequelize.DataTypes);
db.ComplaintTypeOffice = require('./complaintTypeOffice')(sequelize, Sequelize.DataTypes);
db.Notification = require('./notification')(sequelize, Sequelize.DataTypes);
db.Holiday = require('./holiday')(sequelize, Sequelize.DataTypes);
db.CannedMessage = require('./cannedMessage')(sequelize, Sequelize.DataTypes);
db.ClientInvite = require('./clientInvite')(sequelize, Sequelize.DataTypes);
db.Response = require('./response')(sequelize, Sequelize.DataTypes);
db.ResponseFile = require('./responseFile')(sequelize, Sequelize.DataTypes);
db.ResponseRating = require('./responseRating')(sequelize, Sequelize.DataTypes);
db.User = require('./user')(sequelize, Sequelize.DataTypes);
db.UserLog = require('./userlog')(sequelize, Sequelize.DataTypes);
db.Staff = require('./staff')(sequelize, Sequelize.DataTypes);
db.Citizen = require('./citizen')(sequelize, Sequelize.DataTypes);
db.Discussion = require('./discussion')(sequelize, Sequelize.DataTypes);
db.DiscussionComment = require('./discussionComment')(sequelize, Sequelize.DataTypes);
db.DiscussionOffice = require('./discussionoffice')(sequelize, Sequelize.DataTypes);
db.Poll = require('./poll')(sequelize, Sequelize.DataTypes);
db.PollOption = require('./pollOption')(sequelize, Sequelize.DataTypes);
db.PollVote = require('./pollVote')(sequelize, Sequelize.DataTypes);
db.PollQuestion = require('./pollQuestion')(sequelize, Sequelize.DataTypes);
db.PollAnswer = require('./pollAnswer')(sequelize, Sequelize.DataTypes);
db.PollOffice = require('./polloffice')(sequelize, Sequelize.DataTypes);
db.NavLastSeen = require('./navLastSeen')(sequelize, Sequelize.DataTypes);
db.ActivityLog = require('./activitylog')(sequelize, Sequelize.DataTypes);
db.Message = require('./message')(sequelize, Sequelize.DataTypes);
db.DeviceToken = require('./devicetoken')(sequelize, Sequelize.DataTypes);
// ... add all your models here explicitly

// Run associations for all loaded models
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;