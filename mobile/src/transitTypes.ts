export type Coordinate={latitude:number;longitude:number};
export type Journey={id:string;mode:'bus'|'train';route:string;from:string;to:string;date:string;departure:string;arrival:string;fare:number;source:'demo'|'live';path:Coordinate[]};
export type Tracking={trip:Journey;position:Coordinate|null;updatedAt:string|null;stale:boolean;etaMinutes:number|null;crowdPercent:number|null;source:'demo'|'live'};
export type SavedJourney={id:string;tripId:string;date:string;from:string;to:string;mode:'bus'|'train';source:'demo'|'live';label:string};
