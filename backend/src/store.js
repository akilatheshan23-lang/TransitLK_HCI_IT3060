import { ObjectId } from 'mongodb';
import {notificationEvent} from './notifications.js';
export async function createMongoStore(db) {
  const users = db.collection('users');
  const sessions = db.collection('sessions');
  const receipts=db.collection('notificationReceipts');
  await receipts.createIndex({userId:1,eventId:1},{unique:true});
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
  await authorityIncidents.createIndex({createdBy: 1});
  await auditLogs.createIndex({createdAt: -1});
  const savedView=d=>d&&({...d,id:String(d._id),_id:undefined,userId:undefined});
  const lostFoundView = d =>d && ({...d, id: String(d._id), _id: undefined});
    const authorityIncidentView = d =>d && ({...d,id: String(d._id),_id: undefined});
    const isNikethUserId = (userId) => String(userId) === '215b5e3b95b51ee701f269f0';
    const busIdentity=id=>({_id:{$in:[String(id),...(ObjectId.isValid(String(id))?[new ObjectId(String(id))]:[])]}});
    const busOwner=(userId,id)=>isNikethUserId(userId)?busIdentity(id):({...busIdentity(id),ownerId:{$in:[String(userId),...(ObjectId.isValid(String(userId))?[new ObjectId(String(userId))]:[])]}});
    return {
      findTelemetryBus:id=>db.collection('buses').findOne(busIdentity(id),{projection:{status:1,telemetry:1}}),
      ownsTelemetryBus:async(userId,id)=>!!await db.collection('buses').findOne(busOwner(userId,id),{projection:{_id:1}}),
      async writeBusTelemetry(userId,id,sample){return (await db.collection('buses').updateOne({...busOwner(userId,id),$or:[{'telemetry.timestamp':{$lt:sample.timestamp}},{'telemetry.timestamp':{$exists:false}}]},{$set:{telemetry:{...sample,active:true,receivedAt:new Date()}}})).matchedCount===1;},
      stopBusTelemetry:(userId,id)=>db.collection('buses').updateOne(busOwner(userId,id),{$set:{'telemetry.active':false}}),
      async ownerFleetRoutes(userId){
        const identities=[String(userId)];if(ObjectId.isValid(String(userId)))identities.push(new ObjectId(String(userId)));
        const filter = isNikethUserId(userId) ? {} : {ownerId:{$in:identities}};
        return (await db.collection('buses').find(filter).limit(100).toArray()).map(b=>({id:String(b._id),plate:b.busRegNumber,route:b.routeNumber,name:b.routeName,status:b.status,stops:Array.isArray(b.stops)?b.stops.filter(s=>typeof s==='string'):[],gpsAvailable:false}));
      },
    async notificationReadIds(userId){return (await receipts.find({userId},{projection:{eventId:1}}).toArray()).map(r=>r.eventId);},
    async markNotificationsRead(userId,ids){if(ids.length)await receipts.bulkWrite(ids.map(eventId=>({updateOne:{filter:{userId,eventId},update:{$setOnInsert:{userId,eventId,readAt:new Date()}},upsert:true}})));},
    async notificationEvents(user){
      const userId=String(user._id), identities=[userId,user._id];
      const events=[notificationEvent('account',userId,'Account status',`Your ${user.role || 'passenger'} account is ${user.status || 'active'}.`,user.updatedAt || user.createdAt)];
      const tickets=await db.collection('tickets').find({notificationUserId:userId}).sort({issuedAt:-1}).limit(30).toArray();
      for(const t of tickets)events.push(notificationEvent('ticket',t.ticketId,'Ticket update',`${t.isDemo?'Demo ticket':'Ticket'} ${t.ticketId}: ${t.status}.`,t.redeemedAt || t.issuedAt));
      const posts=await lostFoundPosts.find({userId:{$in:identities}}).sort({updatedAt:-1}).limit(20).toArray();
      for(const p of posts)events.push(notificationEvent('community',p._id,'Community activity',`${p.item || 'Your post'}: ${(p.comments || []).length} comments, ${p.likes || 0} likes.`,p.updatedAt || p.createdAt));
      if(['owner','bus_owner'].includes(user.role)){
        const fleet=await db.collection('buses').find({ownerId:{$in:identities}}).sort({updatedAt:-1}).limit(30).toArray();
        for(const b of fleet)events.push(notificationEvent('fleet',b._id,'Fleet schedule update',`${b.busRegNumber || b.routeNumber}: ${b.status || 'pending'}.`,b.updatedAt || b.createdAt));
      }
      if(user.role==='officer' || (user.role==='authority' && user.status==='approved')){
        const incidents=await authorityIncidents.find({}).sort({updatedAt:-1}).limit(30).toArray();
        for(const i of incidents)events.push(notificationEvent('incident',i._id,'Authority incident',`${i.title} — ${i.status || 'open'} (${i.severity || 'normal'}).`,i.updatedAt || i.createdAt));
      }
      if(user.role==='admin'){
        const pending=await users.find({status:'pending'}).sort({createdAt:-1}).limit(30).toArray();
        for(const u of pending)events.push(notificationEvent('approval',u._id,'Account approval required',`${u.name || 'A user'} requested ${u.role} access.`,u.createdAt));
      }
      return events.sort((a,b)=>(b.createdAt || '').localeCompare(a.createdAt || '')).slice(0,100);
    },
    searchTrips:q=>trips.find({from:q.from,to:q.to,mode:q.mode,date:q.date},{projection:{_id:0}}).limit(50).toArray(),
    findTrip:id=>trips.findOne({id},{projection:{_id:0}}),
    updateTelemetry:(id,data)=>trips.findOneAndUpdate({id,$or:[{updatedAt:{$lt:data.updatedAt}},{updatedAt:{$exists:false}}]},{$set:data},{returnDocument:'after'}),
    async listSaved(userId){return (await saved.find({userId}).sort({_id:-1}).limit(100).toArray()).map(savedView);},
    async saveJourney(userId,data){return savedView(await saved.findOneAndUpdate({userId,tripId:data.tripId,date:data.date},{$setOnInsert:{...data,userId,createdAt:new Date()}},{upsert:true,returnDocument:'after'}));},
    async renameSaved(userId,id,label){if(!ObjectId.isValid(id))return null;return savedView(await saved.findOneAndUpdate({_id:new ObjectId(id),userId},{$set:{label}},{returnDocument:'after'}));},
    async deleteSaved(userId,id){if(!ObjectId.isValid(id))return false;return (await saved.deleteOne({_id:new ObjectId(id),userId})).deletedCount===1;},
    async createUser(user) { const result = await users.insertOne(user); return { ...user, _id: result.insertedId }; },
    findEmail: email => users.findOne({ email }),
    findUser: id => {
      if (id instanceof ObjectId) return users.findOne({ _id: id });
      if (typeof id === 'string' && ObjectId.isValid(id)) {
        return users.findOne({ $or: [{ _id: new ObjectId(id) }, { _id: id }] });
      }
      return users.findOne({ _id: id });
    },
    async updateLanguage(id, language) {
      let filter = { _id: id };
      if (id instanceof ObjectId) {
        filter = { _id: id };
      } else if (typeof id === 'string' && ObjectId.isValid(id)) {
        filter = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
      }
      return users.findOneAndUpdate(filter, { $set: { language, updatedAt: new Date() } }, { returnDocument: 'after' });
    },
    async updateUser(id, updates) {
      let filter = { _id: id };
      if (id instanceof ObjectId) {
        filter = { _id: id };
      } else if (typeof id === 'string' && ObjectId.isValid(id)) {
        filter = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
      }
      return users.findOneAndUpdate(filter, { $set: { ...updates, updatedAt: new Date() } }, { returnDocument: 'after' });
    },
    async deleteUser(id) {
      let filter = { _id: id };
      if (id instanceof ObjectId) {
        filter = { _id: id };
      } else if (typeof id === 'string' && ObjectId.isValid(id)) {
        filter = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
      }
      const userRes = await users.deleteOne(filter);
      await sessions.deleteMany({ userId: { $in: [id, String(id)] } });
      return userRes.deletedCount > 0;
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
async findAuthorityIncident(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return authorityIncidentView(
    await authorityIncidents.findOne({
      _id: new ObjectId(id)
    })
  );
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
  data,
  requireOwner = false
) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const query = {
    _id: new ObjectId(id),
    ...(requireOwner
      ? { createdBy: officerId }
      : {})
  };

  const incident =
    await authorityIncidents.findOneAndUpdate(
      query,
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
      action: requireOwner
        ? 'authority.incident.edit'
        : 'authority.incident.status.update',
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
      _id: new ObjectId(id),
      createdBy: officerId
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
