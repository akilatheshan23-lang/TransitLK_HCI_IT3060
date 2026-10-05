import { ObjectId } from 'mongodb';
export async function createMongoStore(db) {
  const users = db.collection('users');
  const sessions = db.collection('sessions');
  await users.createIndex({ email: 1 }, { unique: true });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const trips=db.collection('trips'), saved=db.collection('savedJourneys');
  await trips.createIndex({id:1},{unique:true});
  await trips.createIndex({mode:1,from:1,to:1,date:1});
  await saved.createIndex({userId:1,tripId:1,date:1},{unique:true});
  const savedView=d=>d&&({...d,id:String(d._id),_id:undefined,userId:undefined});
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
    ping: () => db.command({ ping: 1 })
  };
}
