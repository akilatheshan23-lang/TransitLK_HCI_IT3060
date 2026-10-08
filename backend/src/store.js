import { ObjectId } from 'mongodb';
export async function createMongoStore(db) {
  const users = db.collection('users');
  const sessions = db.collection('sessions');
  await users.createIndex({ email: 1 }, { unique: true });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const trips=db.collection('trips'), saved=db.collection('savedJourneys');
  const lostFoundPosts = db.collection('lostFoundPosts');
  await trips.createIndex({id:1},{unique:true});
  await trips.createIndex({mode:1,from:1,to:1,date:1});
  await saved.createIndex({userId:1,tripId:1,date:1},{unique:true});
  await lostFoundPosts.createIndex({ createdAt: -1 });
  await lostFoundPosts.createIndex({ userId: 1 });
  await lostFoundPosts.createIndex({ type: 1 });
  const authorityIncidents =db.collection('authorityIncidents');
  const auditLogs =db.collection('auditLogs');
  await authorityIncidents.createIndex({createdAt: -1});
  await authorityIncidents.createIndex({status: 1});
  await authorityIncidents.createIndex({severity: 1});
  await auditLogs.createIndex({createdAt: -1});
  const savedView=d=>d&&({...d,id:String(d._id),_id:undefined,userId:undefined});
  const lostFoundView = d =>d && ({...d, id: String(d._id), _id: undefined});
  const authorityIncidentView = d =>d && ({...d,id: String(d._id),_id: undefined});
  return {
    searchTrips:q=>trips.find({from:q.from,to:q.to,mode:q.mode,date:q.date},{projection:{_id:0}}).limit(50).toArray(),
    findTrip:id=>trips.findOne({id},{projection:{_id:0}}),
    updateTelemetry:(id,data)=>trips.findOneAndUpdate({id,$or:[{updatedAt:{$lt:data.updatedAt}},{updatedAt:{$exists:false}}]},{$set:data},{returnDocument:'after'}),
    async listSaved(userId){return (await saved.find({userId}).sort({_id:-1}).limit(100).toArray()).map(savedView);},
    async saveJourney(userId,data){return savedView(await saved.findOneAndUpdate({userId,tripId:data.tripId,date:data.date},{$setOnInsert:{...data,userId,createdAt:new Date()}},{upsert:true,returnDocument:'after'}));},
    async renameSaved(userId,id,label){if(!ObjectId.isValid(id))return null;return savedView(await saved.findOneAndUpdate({_id:new ObjectId(id),userId},{$set:{label}},{returnDocument:'after'}));},
    async deleteSaved(userId,id){if(!ObjectId.isValid(id))return false;return (await saved.deleteOne({_id:new ObjectId(id),userId})).deletedCount===1;},
    async createUser(user) { const result = await users.insertOne(user); return { ...user, _id: result.insertedId }; },
    findEmail: email => users.findOne({ email }),
    findUser: id => users.findOne({ _id: new ObjectId(id) }),
    async updateLanguage(id, language) {
      return users.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { language, updatedAt: new Date() } }, { returnDocument: 'after' });
    },
    createSession: session => sessions.insertOne(session),
    findSession: tokenHash => sessions.findOne({ tokenHash, expiresAt: { $gt: new Date() } }),
    deleteSession: tokenHash => sessions.deleteOne({ tokenHash }),
    async listLostFoundPosts() {
    return (
      await lostFoundPosts
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()
    ).map(lostFoundView);
  },

  async findLostFoundPost(id) {
    if (!ObjectId.isValid(id)) return null;

    return lostFoundView(
      await lostFoundPosts.findOne({
        _id: new ObjectId(id)
      })
    );
  },

  async createLostFoundPost(userId, data) {
    const post = {
      ...data,
      userId,
      comments: [],
      likes: 0,
      likedBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await lostFoundPosts.insertOne(post);

    return lostFoundView({
      ...post,
      _id: result.insertedId
    });
  },

  async updateLostFoundPost(userId, id, data) {
    if (!ObjectId.isValid(id)) return null;

    return lostFoundView(
      await lostFoundPosts.findOneAndUpdate(
        {
          _id: new ObjectId(id),
          userId
        },
        {
          $set: {
            ...data,
            updatedAt: new Date()
          }
        },
        {
          returnDocument: 'after'
        }
      )
    );
  },

  async deleteLostFoundPost(userId, id) {
    if (!ObjectId.isValid(id)) return false;

    const result = await lostFoundPosts.deleteOne({
      _id: new ObjectId(id),
      userId
    });

    return result.deletedCount === 1;
  },

  async addLostFoundComment(postId, comment) {
    if (!ObjectId.isValid(postId)) return null;

    return lostFoundView(
      await lostFoundPosts.findOneAndUpdate(
        {
          _id: new ObjectId(postId)
        },
        {
          $push: {
            comments: {
              ...comment,
              createdAt: new Date()
            }
          },
          $set: {
            updatedAt: new Date()
          }
        },
        {
          returnDocument: 'after'
        }
      )
    );
  },

  async likeLostFoundPost(userId, id) {
  if (!ObjectId.isValid(id)) return null;

  const objectId = new ObjectId(id);

  const updated = await lostFoundPosts.findOneAndUpdate(
    {
      _id: objectId,
      likedBy: { $ne: userId }
    },
    {
      $addToSet: { likedBy: userId },
      $inc: { likes: 1 },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );

  if (updated) {
    return lostFoundView(updated);
  }

  return lostFoundView(
    await lostFoundPosts.findOne({ _id: objectId })
  );
  },

  async getAuthorityUserSummary() {
  const result = await users.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  const summary = {
    total: 0,
    passenger: 0,
    owner: 0,
    officer: 0
  };

  for (const entry of result) {
    const role = entry._id || 'passenger';

    if (role in summary) {
      summary[role] = entry.count;
    }

    summary.total += entry.count;
  }

  return summary;
},

async listAuthorityIncidents() {
  return (
    await authorityIncidents
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
  ).map(authorityIncidentView);
},

async createAuthorityIncident(
  officerId,
  officerName,
  data
) {
  const incident = {
    ...data,
    status: 'open',
    createdBy: officerId,
    createdByName: officerName,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result =
    await authorityIncidents.insertOne(
      incident
    );

  await auditLogs.insertOne({
    actorId: officerId,
    action: 'authority.incident.create',
    objectId: String(result.insertedId),
    createdAt: new Date()
  });

  return authorityIncidentView({
    ...incident,
    _id: result.insertedId
  });
},

async updateAuthorityIncident(
  officerId,
  id,
  data
) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const incident =
    await authorityIncidents.findOneAndUpdate(
      {
        _id: new ObjectId(id)
      },
      {
        $set: {
          ...data,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    );

  if (incident) {
    await auditLogs.insertOne({
      actorId: officerId,
      action: 'authority.incident.update',
      objectId: id,
      createdAt: new Date()
    });
  }

  return authorityIncidentView(incident);
},

async deleteAuthorityIncident(
  officerId,
  id
) {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const result =
    await authorityIncidents.deleteOne({
      _id: new ObjectId(id)
    });

  if (result.deletedCount === 1) {
    await auditLogs.insertOne({
      actorId: officerId,
      action: 'authority.incident.delete',
      objectId: id,
      createdAt: new Date()
    });

    return true;
  }

  return false;
},
    ping: () => db.command({ ping: 1 })
  };
}
