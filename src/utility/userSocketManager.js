// userManager.js

let userData = [];      // Store all connected users
let activeUsers = [];   // Store users currently in an active chat

const userManager = {

  /** -----------------------------------
   *  ADD USER (Global User List)
   * ----------------------------------- */
  addUser(socketId, userId, role) {
    const user = { socketId, userId, role };

    // Prevent duplicate entries
    const exists = userData.some(u => u.userId === userId);

    if (!exists) {
      userData.push(user);
    } else {
      // Update socketId if user already exists
      userData = userData.map(u =>
        u.userId === userId ? { ...u, socketId, role } : u
      );
    }

    return userData;
  },

  /** -----------------------------------
   *  REMOVE USER (By socketId)
   * ----------------------------------- */
  removeUser(socketId) {
    let removedUser = null;

    userData = userData.filter(user => {
      if (user.socketId === socketId) {
        removedUser = user;
        return false;
      }
      return true;
    });

    return {
      removedUser,
      currentUsers: userData
    };
  },

  /** -----------------------------------
   *  GET ALL USERS
   * ----------------------------------- */
  getUsers() {
    return userData;
  },

  /** -----------------------------------
   *  GET USER BY USER ID
   * ----------------------------------- */
  getUserById(userId) {
    return userData.find(user => user.userId === userId) || null;
  },

  /** -----------------------------------
   *  ADD / UPDATE ACTIVE CHAT USER
   * ----------------------------------- */
  addActiveChat(userId, conversationId, socketId) {
    const index = activeUsers.findIndex(u => u.userId === userId);

    if (index !== -1) {
      // Update existing entry
      activeUsers[index] = {
        ...activeUsers[index],
        conversationId,
        socketId
      };
    } else {
      // Add new active chat user
      activeUsers.push({ userId, conversationId, socketId });
    }

    console.log("🟢 Active Users:", activeUsers);
  },

  /** -----------------------------------
   *  REMOVE ACTIVE CHAT USER
   * ----------------------------------- */
  removeActiveChat(userId) {
    activeUsers = activeUsers.filter(u => u.userId !== userId);
    console.log("🔴 User removed from active chat:", userId);
  },

  /** -----------------------------------
   *  GET ACTIVE CHAT USER
   * ----------------------------------- */
  getActiveUserById(userId) {
    return activeUsers.find(u => u.userId === userId) || null;
  },

  /** -----------------------------------
   *  GET ALL ACTIVE CHAT USERS
   * ----------------------------------- */
  getAllActiveUsers() {
    return activeUsers;
  }
};

export default userManager;
