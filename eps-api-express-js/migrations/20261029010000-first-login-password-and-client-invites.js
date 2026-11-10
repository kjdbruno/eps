'use strict';

// Accounts that start with a password somebody else knows (the seeded staff: password = username; the seeded
// clients: a random one they have not been told yet) must choose their own at the first login.
//   users.mustChangePassword   until it is cleared, the API refuses everything except changing the password
//   users.lastLoginAt          when the account last signed in (for "signed in" in the Client accounts page)
//   citizens.origin            where a client account came from ('legacy' = seeded from the previous system), so the
//                              Client accounts page only ever touches those and never the ones people registered
//   clientinvites              one row per "your account details" email sent to a client (or tried)
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'mustChangePassword', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('users', 'lastLoginAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('Citizens', 'origin', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.createTable('clientinvites', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('sent', 'failed'),
        allowNull: false
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // the super/admin who sent it
      sentBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addIndex('clientinvites', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('clientinvites');
    await queryInterface.removeColumn('Citizens', 'origin');
    await queryInterface.removeColumn('users', 'lastLoginAt');
    await queryInterface.removeColumn('users', 'mustChangePassword');
  }
};
