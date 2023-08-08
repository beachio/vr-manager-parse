const ASSETS_MODEL = 'ct____u_MQvrDBdhbX__MURAL_VR_Manager____Asset';
const INV_MODEL = 'Inventory';
const { MURAL_HOST, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SCOPE } = process.env;
const VR_FILES_MODEL = 'VrFiles';
const ROOM_MODEL = 'Room';
const ROOMMEMBERS_MODEL = 'RoomMembers';
const STARED_ROOMS = 'StaredRooms';
console.log('For Deployment');
const STARED_ASSETS_MODEL = 'StaredAssets';
const ROOM_OBJECTS = 'RoomObjects';

const WORLD_MODEL = 'ct____u_MQvrDBdhbX__MURAL_VR_Manager____World';
const PAIR_MODEL = 'PairCode';
const DEEP_LINKS_MODEL = 'DeepLinks';
const WHITELIST_MODEL = 'OculusUsersWhiteList';


const refreshMuralToken = async (refreshToken) => {
 try {
        const url = `https://${MURAL_HOST}/api/public/v1/authorization/oauth2/refresh`;
				const params = {
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          	scope: SCOPE,
          	client_id: CLIENT_ID,
          	client_secret: CLIENT_SECRET
        };
        const res = await axios.post(url, params,
            {
                headers: {
                    'content-type': 'application/json',
                    'Accept': 'application/json'
                }
            });
      	return res.data;
    } catch (error) {
        throw new Error('Problem while refreshing token, maybe you need to relogin')
    }
}



const rndString = (length) => {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const rndNum = (length) => {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const generateUniqueCode = async () => {
  const pairObj = new Parse.Query(PAIR_MODEL);
  let count = 0;
  let code = '';
  do {
    code = rndNum(6);
    pairObj.equalTo('code', code);
    count = await pairObj.count();
  } while (count > 0);

  return code;
}

const cleanUpExpiredCodes = async () => {
  const pairObj = new Parse.Query(PAIR_MODEL);
  pairObj.lessThan('exp', new Date());
  const objectsToDelete = await pairObj.find();
  const removeList= [];
  for (const o of objectsToDelete) {
    removeList.push(o.destroy());
  }
  await Promise.all(removeList)
}

const mapMuralUser = (keys, userJsonObj) => {
  const user = {};
  if (userJsonObj.authData) {
    if (userJsonObj.authData.mural) {
      for (const k of keys) {
        user[k] = userJsonObj.authData.mural[k]
      }
      user['id'] = userJsonObj['objectId'];
      
      return user;
    }
  }
  console.log('test message');
  return { avatar: 'https://lh3.googleusercontent.com/a/ALm5wu0VBGoK73VHJ7ZsNwRzQeG20RozHbGRwOVPk5lt=s96-c', firstName: 'N/a', lastName: '' };
}

const mapAssetFile = (assetJsonObj) => {
    if (assetJsonObj) {
        return {
            id: assetJsonObj.objectId,
            name: assetJsonObj.name,
            fileUrl: assetJsonObj.file.url,
            type: assetJsonObj.type,
            size: assetJsonObj.size,
        };
    }
    return null;
}

const mapAsset = (assetObject) => {
  if (assetObject) {
  return {
    id: assetObject._getId(),
    keyImage: assetObject.get("Key_Image")
      ? assetObject.get("Key_Image").toJSON().file.url
      : null,
    description: assetObject.get("Description")
      ? assetObject.get("Description")
      : null,
    name: assetObject.get("Name") ? assetObject.get("Name") : null,
    slug: assetObject.get("Slug") ? assetObject.get("Slug") : null,
    assetFile: assetObject.get("Asset_File")
      ? mapAssetFile(assetObject.get("Asset_File").toJSON())
      : null,
    author: assetObject.get("Author")
      ? assetObject.get("Author")[0].toJSON().Name
      : null,
    userOwner: assetObject.get("userOwner")
      ? mapMuralUser(
          ["avatar", "firstName", "lastName"],
          assetObject.get("userOwner").toJSON()
        )
      : null,
    updatedAt: assetObject.updatedAt.toJSON(),
    createdAt: assetObject.createdAt.toJSON(),
  };
  } else {
  	return undefined
  }
};

const mapVrFile = (vrFileObj) => {
  return {
    id: vrFileObj._getId(),
    owner: vrFileObj.get("owner")
      ? mapMuralUser(
          ["avatar", "firstName", "lastName"],
          vrFileObj.get("owner").toJSON()
        )
      : null,
    asset: vrFileObj.get("asset")
      ? vrFileObj.get("asset")
      : null,
    name: vrFileObj.get("name")
      ? vrFileObj.get("name")
      : null,
    type: vrFileObj.get("type")
      ? vrFileObj.get("type")
      : null,
    updatedAt: vrFileObj.updatedAt.toJSON(),
    createdAt: vrFileObj.createdAt.toJSON(),
  };
};

Parse.Cloud.define("refresh", async (request) => {
    try {
        const { refreshToken } = request.params;
        const url = `https://${MURAL_HOST}/api/public/v1/authorization/oauth2/refresh`;
		const params = {
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          	scope: SCOPE,
          	client_id: CLIENT_ID,
          	client_secret: CLIENT_SECRET
        };
        const res = await axios.post(url, params,
            {
                headers: {
                    'content-type': 'application/json',
                    'Accept': 'application/json'
                }
            });
      	return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in refresh", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});

Parse.Cloud.define("token", async (request) => {
    try {
        const { code } = request.params;
        const url = `https://${MURAL_HOST}/api/public/v1/authorization/oauth2/token`;
		const params = {
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: "authorization_code",
          	redirect_uri: REDIRECT_URI
        };
        const res = await axios.post(url, params,
            {
                headers: {
                    'content-type': 'application/json',
                    'Accept': 'application/json'
                }
            });
      	return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in token", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});

Parse.Cloud.define("me", async (request) => {
    try {
        const { token } = request.params;
        const res = await axios.get(`https://${MURAL_HOST}/api/public/v1/users/me`, { headers: { "Authorization": `Bearer ${token}` } });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in me", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});

Parse.Cloud.define("mural-login", async (request) => {
    try {
        const { token, refreshToken } = request.params;
        const res = await axios.get(`https://${MURAL_HOST}/api/public/v1/users/me`, { headers: { "Authorization": `Bearer ${token}` } });      
         let user;
        // Check for existing user with email given from `token` request response
        const userQuery = new Parse.Query('User');
        userQuery.equalTo('email', email)
        user = await userQuery.first();
        const oldId = user ? user.id : null;

        if (!user) user = new Parse.User();
        await user.linkWith('mural', { authData }, { useMasterKey: true });

        // set username and email for the new user
        if (!oldId) {
          await user.save({ 
            'username': email, 
            'email': email
          }, 
          { useMasterKey: true });
        }
      
        return { status: 'success', result: user };
    } catch (error) {
        console.log("error in me", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
}, 
{ fields : ['token', 'refreshToken'] },
);

Parse.Cloud.define("getAllMurals", async (request) => {
    try {
        const { token } = request.params;
        const res = await axios.get(`https://${MURAL_HOST}/api/public/v1/murals`, { headers: { "Authorization": `Bearer ${token}` } });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in getAllMurals", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});

Parse.Cloud.define("getAllWorkspaces", async (request) => {
    try {
        const { token } = request.params;
        const res = await axios.get(`https://${MURAL_HOST}/api/public/v1/workspaces`, { headers: { "Authorization": `Bearer ${token}` } });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in getAllWorkspaces", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});

Parse.Cloud.define("getMuralsByRoom", async (request) => {
    try {
        const { token, workspaceId, roomId } = request.params;
        const res = await axios.get(`https://${MURAL_HOST}/api/public/v1/rooms/${roomId}/murals`, { headers: { "Authorization": `Bearer ${token}` } });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in getMuralsByRoom", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});

Parse.Cloud.define("createMural", async (request) => {
    try {
        const { token, title, workspaceId, roomId } = request.params;
        const url = `https://${MURAL_HOST}/api/public/v1/murals`;
        const params = {
            title,
            workspaceId,
            roomId
        }
        const res = await axios.post(url,
            params,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    'content-type': 'application/json',
                    'Accept': 'application/json'
                }
            });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in getAllWorkspaces", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});

Parse.Cloud.define("getAllRooms", async (request) => {
    try {
        const { token, workspaceId } = request.params;
        const url = `https://${MURAL_HOST}/api/public/v1/workspaces/${workspaceId}/rooms`;
        const res = await axios.get(url, { headers: { "Authorization": `Bearer ${token}` } });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in getAllRooms", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});


Parse.Cloud.define("getWorkspaceById", async (request) => {
    try {
        const { token, workspaceId } = request.params;
        const url = `https://${MURAL_HOST}/api/public/v1/workspaces/${workspaceId}`;
        const res = await axios.get(url, { headers: { "Authorization": `Bearer ${token}` } });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in getWorkspaceById", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});
Parse.Cloud.define("getCurrentUser", async (request) => {
    try {
        const { token } = request.params;
        const url = `https://${MURAL_HOST}/api/public/v1/me`;
        const res = await axios.get(url, { headers: { "Authorization": `Bearer ${token}` } });
        return { status: 'success', result: res.data };
    } catch (error) {
        console.log("error in getWorkspaceById", error);
        return { status: 'error', error: error.toString(), errorObject: JSON.stringify(error) };
    }
});


Parse.Cloud.define("assets", async (request) => {
  const query = new Parse.Query(ASSETS_MODEL);
  query.include('Asset_File');
  query.include('Key_Image');
  query.include('userOwner');
  query.include(['Author']);

  query.include(['Worlds']);
  query.include(['Metadata']);
  query.equalTo("t__status", "Published");

  query.descending(['updatedAt'])

  const results = await query.find({ useMasterKey: true });
  const lst = [];
  
  for (const assetObject of results) {  
      lst.push(mapAsset(assetObject));
  }
	
  return { result: lst, status: 'success' };
},{
  // fields : ['movie'],
  // requireUser: true
});

Parse.Cloud.define("vr-file", async (request) => {
  const { user } = request;
  const { type } = request.params;

  const query = new Parse.Query(VR_FILES_MODEL);
  query.equalTo("owner", {objectId: user.id, __type: "Pointer", className: '_User'});
  query.descending(['updatedAt'])

  if (type) {
    query.equalTo("type", type);
  }
  
  query.include('asset');
  query.include('owner');
 
  const results = await query.find({ useMasterKey: true });
  const lst = [];
  
  for (const vrFile of results) {  
      lst.push(mapVrFile(vrFile));
  }
	
  return { result: lst, status: 'success' };
},{
  // fields : ['movie'],
  requireUser: true
});

Parse.Cloud.define("stared-assets", async (request) => {
  const { user } = request;
  const { populate } = request.params;

  const query = new Parse.Query(STARED_ASSETS_MODEL);
  query.equalTo("user", {objectId: user.id, __type: "Pointer", className: '_User'});
  query.equalTo("stared", true);
  
  if (populate) {
    	query.include('asset.Asset_File');
  		query.include('asset.Key_Image');
  		query.include('asset.userOwner');
  }

  const results = await query.find({ useMasterKey: true });
  const lst = [];

  for (const staredAsset of results) {
    //lst.push(staredAsset)
      populate ? lst.push(mapAsset(staredAsset.get('asset'))) : lst.push(staredAsset.get('asset').toJSON().objectId);
  }
	
  return { result: lst, status: 'success' };
},{
  requireUser: true
});

Parse.Cloud.define("star-asset", async (request) => {
  const { user } = request;
  let { assetId, stared } = request.params;

  const query = new Parse.Query(STARED_ASSETS_MODEL);
  query.equalTo("user", {objectId: user.id, __type: "Pointer", className: '_User'});
  query.equalTo("asset", {objectId: assetId, __type: "Pointer", className: ASSETS_MODEL});

  const result = await query.first({ useMasterKey: true });
  
  stared = !!stared;
  if (result) {
  	result.set('stared', !stared);
    await result.save()
  } else {
  	  const staredObj = new Parse.Object(STARED_ASSETS_MODEL);
  	  staredObj.set('user', {objectId: user.id, __type: "Pointer", className: '_User'});
  	  staredObj.set('stared', !stared);
  	  staredObj.set('asset', {objectId: assetId, __type: "Pointer", className: ASSETS_MODEL});
      await staredObj.save();
  }
	
  return { result: { result: stared }, status: 'success' };
},{
  fields : ['assetId', 'stared'],
  requireUser: true
});

Parse.Cloud.define("inventory", async (request) => {
  const { user } = request;

  const query = new Parse.Query(INV_MODEL);
  query.equalTo("user", {objectId: user.id, __type: "Pointer", className: '_User'});
  query.equalTo("added", true);
  
  query.include('asset');
	query.include('asset.Asset_File');
  query.include('asset.Key_Image');
  query.include('asset.userOwner');
  
	const results = await query.find({ useMasterKey: true });
  const lst = [];

  for (const invAsset of results) {
		  const asset = mapAsset(invAsset.get('asset'));
     	lst.push({...asset, added: invAsset.get('added')})
  }
  
  return { result: lst, status: 'success' };
},{
  requireUser: true
});

Parse.Cloud.define("asset", async (request) => {
  let { assetId } = request.params;
  const { user } = request;

  const query = new Parse.Query(ASSETS_MODEL);
  query.equalTo("objectId", assetId);
  query.equalTo("t__status", "Published");
	query.include('Asset_File');
  query.include('Key_Image');
  query.include('userOwner');
  query.include(['Worlds']);
  query.include(['Author']);
  query.include(['Categories']);
  query.include(['Metadata']);
  query.include(['Usage']);


  const query1 = new Parse.Query(INV_MODEL);
  query1.equalTo("asset", {objectId: assetId, __type: "Pointer", className: ASSETS_MODEL});
	query1.equalTo("user", {objectId: user.id, __type: "Pointer", className: '_User'});
  const result = await query.first({ useMasterKey: true });
	const result1 = await query1.first({ useMasterKey: true });
	let r = result.toJSON();
  
  if (result1) {
  	r.added = result1.get('added') ? result1.get('added') : false;
  }
  
  return { result: r, status: 'success' };
},{
  fields: ['assetId'],
  requireUser: true
});

Parse.Cloud.define("inventory-add", async (request) => {
  let { assetId, added } = request.params;
  const { user } = request;

  const query = new Parse.Query(INV_MODEL);
  query.equalTo("user", {objectId: user.id, __type: "Pointer", className: '_User'});
  query.equalTo("asset", {objectId: assetId, __type: "Pointer", className: ASSETS_MODEL});

  const result = await query.first({ useMasterKey: true });
  
  added = !!added;
  if (result) {
  	result.set('added', added);
    await result.save()
  } else {
  	  const staredObj = new Parse.Object(INV_MODEL);
  	  staredObj.set('user', {objectId: user.id, __type: "Pointer", className: '_User'});
  	  staredObj.set('added', added);
  	  staredObj.set('asset', {objectId: assetId, __type: "Pointer", className: ASSETS_MODEL});
      await staredObj.save();
  }
	
  return { result: { result: added }, status: 'success' };
},{
  fields: ['assetId', 'added'],
  requireUser: true
});


// Related with Mural Auth
Parse.Cloud.define('linkWith', async (request) => {
  const { authData, email } = request.params;
  try {
    let user;
    // Check for existing user with email given from `token` request response
    const userQuery = new Parse.Query('User');
    userQuery.equalTo('email', email)
    user = await userQuery.first();
    const oldId = user ? user.id : null;

    if (!user) user = new Parse.User();
    await user.linkWith('mural', { authData }, { useMasterKey: true });
    
    // set username and email for the new user
    if (!oldId) {
      await user.save({ 
        'username': email, 
        'email': email
      }, 
      { useMasterKey: true });
    }
    return { status: 'success', result: user };
  } catch (error) {
    console.error('inside linkWith', error);
    return { status: 'error', error };
  }
}, {
  fields: ['authData', 'email'],
});

Parse.Cloud.define('loginWithCode', async (request) => {
  const { code } = request.params;
  try {
    const pairQuery = new Parse.Query(PAIR_MODEL);
    pairQuery.equalTo('code', code);
    pairQuery.include('user')
    const pair = await pairQuery.first({ useMasterKey: true });
    
    if (!pair) {
     return { status: 'error', error: "Wrong code" };
    }
    
    if (Date.now() > new Date(pair.get('exp').toJSON()).getTime()) {
    	return { status: 'error', error: "Code expired" };
		}
    
    const sessionQuery = new Parse.Query('_Session');
    sessionQuery.equalTo('user', {objectId: pair.get('user')._getId(), __type: "Pointer", className: '_User'});
		const session = await sessionQuery.first({ useMasterKey: true });
    
    if (!session) {
    	return { status: 'error', error: "No active session" };
		}
    
    // Remove the code after successfull login 
    await pair.destroy();
   
    return { status: 'success', result: { ...mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], pair.get('user').toJSON()), sessionToken: session.get('sessionToken')} };
  } catch (error) {
    console.error('inside loginWithCode', error);
    return { status: 'error', error };
  }
}, {
  fields: ['code'],
});

Parse.Cloud.define('generatePairCode', async (request) => {
  const { user } = request;
  try {
    const pairQuery = new Parse.Query(PAIR_MODEL);
    pairQuery.equalTo('user', {objectId: user.id, __type: "Pointer", className: '_User'});
    const pair = await pairQuery.first();
    // Set exp date 30 mins
    const expDate = new Date(new Date().setTime(new Date().getTime() + (30 * 60 * 1000)));
    const code = await await generateUniqueCode();
    
    // #TODO move it to job 
    await cleanUpExpiredCodes();
    
    if (!pair) {
      const pairCodeObj = new Parse.Object(PAIR_MODEL);

      pairCodeObj.set('user', {objectId: user.id, __type: "Pointer", className: '_User'});
      pairCodeObj.set('code', code);
      pairCodeObj.set('exp', expDate);

      await pairCodeObj.save();
    } else {
 			pair.set('code', code);
      pair.set('exp', expDate);
      await pair.save();
		}
    
    return { status: 'success', result: { code } };
  } catch (error) {
    console.error('inside generatePairCode', error);
    return { status: 'error', error };
  }
}, {
  requireUser: true,
});

Parse.Cloud.define('room', async (request) => {
  try {
    const query = new Parse.Query(ROOM_MODEL);
    const query1 = new Parse.Query(ROOMMEMBERS_MODEL);
		query.include('world');
  	query.include('creator');
  	query1.include('user');
  
   	const results = await query.find({ useMasterKey: true });
    const lst = [];
    const lst1 = [];
    const roomIds = [];
    const lst2 = [];

    for (const room of results) {
    	const roomJson = room.toJSON();
    	lst.push({...roomJson, creator: mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], roomJson.creator)});
			roomIds.push(roomJson.objectId);
    }
    
    query1.containedIn("room", roomIds);
    const results1 = await query1.find({ useMasterKey: true });

    for (const roomM of results1) {
      const roomMemberJson = roomM.toJSON();
      const room = lst.find(r => r.objectId === roomMemberJson.room.objectId);
      const roomIndex = lst.findIndex(r => r.objectId === roomMemberJson.room.objectId);
      lst[roomIndex].members = room.members ? room.members : [];
      lst[roomIndex].members.push(mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], roomMemberJson.user));
    }
    

    return { status: 'success', result: lst };
  } catch (error) {
    console.error('inside linkWith', error);
    return { status: 'error', error };
  }
})

Parse.Cloud.define('roomByCode', async (request) => {
  const { code } = request.params;
  try {
    const query = new Parse.Query(ROOM_MODEL);
    const query1 = new Parse.Query(ROOMMEMBERS_MODEL);

  	query1.include('user');
    query.include('world');
  	query.include('creator');
    query.descending("updatedAt");
    query.equalTo('code', code);

   	const result = await query.first();
    const roomJson = result.toJSON();

    query1.equalTo("room", {objectId: roomJson.objectId, __type: "Pointer", className: ROOM_MODEL});
    const query2 = new Parse.Query(ROOM_OBJECTS);
    query2.equalTo("room", {objectId: roomJson.objectId, __type: "Pointer", className: ROOM_MODEL});
    const resultObjects = await query2.find({ useMasterKey: true });

    const resultMembers = await query1.find({ useMasterKey: true });
		roomJson.members = [];
    roomJson.objects = [];

		for (const roomM of resultMembers) {
      roomJson.members.push(mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], roomM.toJSON().user));      
    }
        
    for (const obj of resultObjects) {
      roomJson.objects.push(obj.toJSON());      
    }
    
    return roomJson;
  } catch (error) {
    console.error('inside linkWith', error);
    return { status: 'error', error };
  }
}, {
  fields: ['code'],
})

Parse.Cloud.define('addMember', async (request) => {
  const { roomId } = request.params;
  const { user } = request;
  try {
    const query = new Parse.Query(ROOMMEMBERS_MODEL);
    const query1 = new Parse.Query(ROOM_MODEL);

    query.equalTo("room", { objectId: roomId, __type: "Pointer", className: ROOM_MODEL });
    query.equalTo("user", { objectId: user.id, __type: "Pointer", className: '_User' });

    query1.include("creator");
    query1.equalTo("objectId", roomId);
    
    const memberResult = await query.first({ useMasterKey: true });
    const roomResult = await query1.first({ useMasterKey: true });
    const member = memberResult ? memberResult.toJSON() : undefined;
    let memberObj;

		if (!member && roomResult) {
      const room = roomResult.toJSON()
      if (room.creator.objectId != user.id) {
      	memberObj = new Parse.Object(ROOMMEMBERS_MODEL);
  	  	memberObj.set('user', {objectId: user.id, __type: "Pointer", className: '_User'});
      	memberObj.set('room', {objectId: roomId, __type: "Pointer", className: ROOM_MODEL});
				await memberObj.save();
      }
		}
    
    return { status: 'success', result: memberObj || member };
  } catch (error) {
    console.error('inside addMember', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
  	fields: ['roomId'],
})

Parse.Cloud.define('removeMember', async (request) => {
  const { roomId } = request.params;
  const { user } = request;
  try {
    const query = new Parse.Query(ROOMMEMBERS_MODEL);

    query.equalTo("room", { objectId: roomId, __type: "Pointer", className: ROOM_MODEL });
    query.equalTo("user", { objectId: user.id, __type: "Pointer", className: '_User' });
    
    const memberResult = await query.first({ useMasterKey: true });

		if (memberResult) {
     await memberResult.destroy();
		}
    
    return { status: 'success', result: memberResult };
  } catch (error) {
    console.error('inside addMember', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
  	fields: ['roomId'],
})

Parse.Cloud.define('roomByMuralUser', async (request) => {
  const { userId } = request.params;
  try {
    const query = new Parse.Query('User');
    const query1 = new Parse.Query(ROOMMEMBERS_MODEL);
    const query2 = new Parse.Query(ROOM_MODEL);

    query.equalTo("authData.mural.id", userId);
    
    const userRes = await query.first({ useMasterKey: true });
    
    if (!userRes) {
    	return [];
    }
    const user = userRes.toJSON();
    query1.include('room');
    query1.equalTo("user", { objectId: user.objectId, __type: "Pointer", className: '_User' });
    query2.equalTo("creator", { objectId: user.objectId, __type: "Pointer", className: '_User' });
    const roomsRes = await query1.find({ useMasterKey: true });
    const roomsRes1 = await query2.find({ useMasterKey: true });

		const rooms = [];
    
   	for (const room of roomsRes) {
      const roomObj = room.get('room');
      let r;
      if (roomObj) {
        r = roomObj.toJSON();
        rooms.push({id: r.objectId, name: r.name, code: r.code});
			} else {
        console.log(room,'broken roommember obj')
			}
    }
    
    for (const room of roomsRes1) {
      const rObj = {id: room._getId(), name: room.get('name'), code: room.get('code')};
      if (!rooms.find(r => r.id === rObj.id)) {
      	rooms.push(rObj);
      }
    }
    
    return rooms;
  } catch (error) {
    console.error('inside roomByMuralUser', error);
    return { status: 'error', error };
  }
}, {
  	fields: ['userId'],
})

Parse.Cloud.define('roomByUser', async (request) => {
  const { user } = request;
  try {
    const query1 = new Parse.Query(ROOMMEMBERS_MODEL);
    const query2 = new Parse.Query(ROOM_MODEL);

    query1.include('room');
    query1.include('room.creator');
    query1.include('room.world');
    query1.include('room.world.Key_Image');

    query2.include('creator');
    query2.include('world');
    query2.include('world.Key_Image');
    
    query1.equalTo("user", { objectId: user.id, __type: "Pointer", className: '_User' });
    query2.equalTo("creator", { objectId: user.id, __type: "Pointer", className: '_User' });
    const roomsRes = await query1.find({ useMasterKey: true });
    const roomsRes1 = await query2.find({ useMasterKey: true });

		const rooms = [];
    
   	for (const roomMember of roomsRes) {
      const room = roomMember.get('room');
      const roomMemberObj = roomMember.toJSON();
      const r = { ...roomMemberObj.room };
      let img = {};
      
      if (room) {
      	r['id'] = room._getId();
      } else {
      	console.log(roomMemberObj.objectId, 'broken room member')
      }
      
       if (r.world.Key_Image) {
          img = r.world.Key_Image.file;
       }
      
      if (r.world) {	
         r.world = { name: r.world.Name, img };
      } else {
        console.log(r.id, 'broken world');
      }
      
      if (r.creator) {
      	r.creator = mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], r.creator);
      } else {
        console.log(r.id, 'broken creator');
      }
      rooms.push(r);
    }
    
    for (const room of roomsRes1) {
      const roomObj = room.toJSON();
			let img = {};
      const rObj = {id: room._getId(), ...roomObj};
      if (!rooms.find(r => r.id === rObj.id)) {        
        if (rObj.world) {
          if (rObj.world.Key_Image) {
          	img = rObj.world.Key_Image.file;
       		}
        
          rObj.world = { name: rObj.world.Name, img };
      	} else {
        	console.log(rObj.id, 'broken world')
      	}
        if (rObj.creator) {
        	rObj.creator = mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], rObj.creator);
        } else {
        	console.log(rObj.id, 'broken creator')
        }
      	rooms.push(rObj);
      }
    }
    
    return { status: 'success', result: rooms };
  } catch (error) {
    console.error('inside roomByUser', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
})

Parse.Cloud.define("star-room", async (request) => {
  const { user } = request;
  let { roomId, stared } = request.params;

  const query = new Parse.Query(STARED_ROOMS);
  query.equalTo("user", {objectId: user.id, __type: "Pointer", className: '_User'});
  query.equalTo("room", {objectId: roomId, __type: "Pointer", className: ROOM_MODEL});

  const result = await query.first({ useMasterKey: true });
  
  stared = !!stared;
  if (result) {
  	result.set('stared', !stared);
    await result.save()
  } else {
  	  const staredObj = new Parse.Object(STARED_ROOMS);
  	  staredObj.set('user', { objectId: user.id, __type: "Pointer", className: '_User' });
  	  staredObj.set('stared', !stared);
  	  staredObj.set('room', { objectId: roomId, __type: "Pointer", className: ROOM_MODEL });
      await staredObj.save();
  }
	
  return { result: { result: stared }, status: 'success' };
},{
  fields : ['roomId', 'stared'],
  requireUser: true
});

Parse.Cloud.define("stared-rooms", async (request) => {
  const { user } = request;
  const { populate } = request.params;

  const query = new Parse.Query(STARED_ROOMS);
  query.equalTo("user", {objectId: user.id, __type: "Pointer", className: '_User'});
  query.equalTo("stared", true);
  
  if (populate) {
  		query.include('room.world');
  		query.include('room.creator');
      query.include('room.world.Key_Image');
  }

  const results = await query.find({ useMasterKey: true });
  const lst = [];

  for (const staredAsset of results) {
    	let room = staredAsset.get('room').toJSON();
    	if (!populate) {
      	lst.push(room.objectId);
      } else {
        let world = { name: 'Removed World', img: '' };
        if (room.world) {
          world = { name: room.world.Name, img: room.world.Key_Image ? room.world.Key_Image.file : '' };
				}
        room.world = world;
        room.creator = mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], room.creator);
      	lst.push(room);
      }
  }
	
  return { result: lst, status: 'success' };
},{
  requireUser: true
});

Parse.Cloud.define("roomById", async (request) => {
  const { roomId } = request.params;

  const query = new Parse.Query(ROOM_MODEL);
  const query1 = new Parse.Query(ROOMMEMBERS_MODEL);
  query1.include("user");
  query1.equalTo("room", {objectId: roomId, __type: "Pointer", className: ROOM_MODEL});
  const rMembersRes = await query1.find({ useMasterKey: true });
  
  const query2 = new Parse.Query(ROOM_OBJECTS);
  query2.equalTo("room", {objectId: roomId, __type: "Pointer", className: ROOM_MODEL});
  query2.limit(10000);
  const resultObjects = await query2.find({ useMasterKey: true });
  
  const query3 = new Parse.Query(DEEP_LINKS_MODEL);
  query3.equalTo("vrRoomId", {objectId: roomId, __type: "Pointer", className: ROOM_MODEL});
  const deepLinks = await query3.find({ useMasterKey: true });


  query.equalTo("objectId", roomId);
  
  query.include('world');
  query.include('creator');
  query.include('world.Key_Image');
  query.include(['world.Supported_Activities']);
  query.include(['world.Locations']);

  const result = await query.first({ useMasterKey: true });
  const room = result.toJSON();
  const img = {};
  room.creator = mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], room.creator);
	room.members = [];
 	room.deepLinks = [];

  
  if (room.world.Key_Image) {
    img.name = room.world.Key_Image.file.name;
    img.url = room.world.Key_Image.file.url;
  } else {
  	img.name = '';
    img.url = '';
  }
  
  room.world = {
    img,
    name: room.world.Name, 
    locations: room.world.Locations ? room.world.Locations.map(l => ({name: l.Name })) : [],
    supportedActivities: room.world.Supported_Activities ? room.world.Supported_Activities.map(sa => ({name: sa.name })) : [],
  };
  room.objects = [];
  
  for (const roomMember of rMembersRes) {
     const member = roomMember.toJSON();
     room.members.push(mapMuralUser(['username', 'email', 'firstName', 'lastName', 'avatar'], member.user));
   }
  
   for (const obj of resultObjects) {
      room.objects.push(obj.toJSON());      
   }

	 for (const deepLink of deepLinks) {
      room.deepLinks.push(deepLink.toJSON());      
   }
  
  return { result: room, status: 'success' };
},{
  fields : ['roomId'],
});

Parse.Cloud.define('removeMemberById', async (request) => {
  const { roomId, userId } = request.params;
  const { user } = request;
  try {
    // Check if current user is creator
    const query1 = new Parse.Query(ROOM_MODEL);
    query1.equalTo("objectId", roomId);
    query1.equalTo("creator", { objectId: user.id, __type: "Pointer", className: '_User' });

    const query = new Parse.Query(ROOMMEMBERS_MODEL);

    query.equalTo("room", { objectId: roomId, __type: "Pointer", className: ROOM_MODEL });
    query.equalTo("user", { objectId: userId, __type: "Pointer", className: '_User' });
    
    const memberResult = await query.first({ useMasterKey: true });
    const creatorResult = await query1.first({ useMasterKey: true });

		if (memberResult && creatorResult) {
     await memberResult.destroy();
     return { status: 'success', result: memberResult };
		} else {
     return { status: 'error', result: {} };
    }
    
  } catch (error) {
    console.error('inside addMember', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
  	fields: ['roomId', 'userId'],
})

Parse.Cloud.define('addMemberById', async (request) => {
  const { roomId, userId } = request.params;
  const { user } = request;
  try {
    // Check if current user is creator
    const query1 = new Parse.Query(ROOM_MODEL);
    query1.equalTo("objectId", roomId);
    query1.equalTo("creator", { objectId: user.id, __type: "Pointer", className: '_User' });

    const query = new Parse.Query(ROOMMEMBERS_MODEL);

    query.equalTo("room", { objectId: roomId, __type: "Pointer", className: ROOM_MODEL });
    query.equalTo("user", { objectId: userId, __type: "Pointer", className: '_User' });
    
    const memberResult = await query.first({ useMasterKey: true });
    const creatorResult = await query1.first({ useMasterKey: true });
		let memberObj;
    
		if (!memberResult && creatorResult && userId != user.id) {
     memberObj = new Parse.Object(ROOMMEMBERS_MODEL);
  	 memberObj.set('user', {objectId: userId, __type: "Pointer", className: '_User'});
     memberObj.set('room', {objectId: roomId, __type: "Pointer", className: ROOM_MODEL});
		 await memberObj.save();
     return { status: 'success', result: memberObj };
		} else {
     return { status: 'error', result: {} };
    }
    
  } catch (error) {
    console.error('inside addMemberById', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
  	fields: ['roomId', 'userId'],
})

Parse.Cloud.define('muralUsers', async (request) => {
  const { user } = request;
  try {
    const query = new Parse.Query("User");
    query.notEqualTo("objectId", user.id);
    query.equalTo("emailVerified", true);
    query.include("authData");

    //query.select(["authData"]);
		const usersObjects = await query.find({ useMasterKey: true });
    const users = [];
    
    for (const userObj of usersObjects) {
      const user = userObj.toJSON();
      if (user.authData) {
				const muralUser = mapMuralUser(['firstName', 'lastName'], user);
        muralUser.userName = muralUser.firstName + ' ' + muralUser.lastName;
        muralUser.firstName = undefined;
        muralUser.lastName = undefined;
    		users.push(muralUser);
      }
  	}

    return { status: 'success', result: users };
  } catch (error) {
    console.error('inside muralUsers', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
})

Parse.Cloud.define('worlds', async (request) => {
  try {
    const query = new Parse.Query(WORLD_MODEL);
    query.equalTo("t__status", "Published");

		const worldObjcts = await query.find({ useMasterKey: true });
    const worlds = [];
    
    for (const worldObj of worldObjcts) {
      const world = worldObj.toJSON();
    	worlds.push({ id: world.objectId, name: world.Name });
  	}

    return { status: 'success', result: worlds };
  } catch (error) {
    console.error('inside worlds', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
})

Parse.Cloud.define('createRoom', async (request) => {
  const { user } = request;
  const { roomModel } = request.params;
  try {
     const roomObj = new Parse.Object(ROOM_MODEL);
     const query = new Parse.Query(ROOM_MODEL);
     query.equalTo("code", roomModel.code);
		 const room = await query.first({ useMasterKey: true });
    
     if (room) {
      throw 'Code already exist'
     }

  	 roomObj.set('creator', {objectId: user.id, __type: "Pointer", className: '_User'});
     roomObj.set('world', {objectId: roomModel.world, __type: "Pointer", className: WORLD_MODEL});
     roomObj.set('name', roomModel.name);
     roomObj.set('code', roomModel.code);

		 await roomObj.save();
    
    return { status: 'success', result: roomObj._getId() };
  } catch (error) {
    console.error('inside createRoom', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
})

Parse.Cloud.define('uploadFileByUrl', async (request) => {
  const { url } = request.params;
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer'});
    const data = Array.from(Buffer.from(response.data, 'binary'));
    const contentType = response.headers['content-type'];
    const file = new Parse.File('widget_img', data, contentType);
    await file.save({useMasterKey: true});
    
    return { status: 'success', result: file };
  } catch (error) {
    console.error('inside uploadFileByUrl', error);
    return { status: 'error', error };
  }
}, {
  	 fields: ['url'],
})

Parse.Cloud.define('createDeepLink', async (request) => {
  const { roomId, muralId, deepLink, sceneId, vrRoomId, muralUrl } = request.params;
  try {
     const deepLinkObj = new Parse.Object(DEEP_LINKS_MODEL);
  	 deepLinkObj.set('roomId', roomId);
  	 deepLinkObj.set('muralId', muralId);
     deepLinkObj.set('deepLink', deepLink);
  	 deepLinkObj.set('sceneId', sceneId);
     deepLinkObj.set('muralUrl', muralUrl);
  	 deepLinkObj.set('vrRoomId', {objectId: vrRoomId, __type: "Pointer", className: ROOM_MODEL});
     await deepLinkObj.save();
    return { status: 'success', result: true };
  } catch (error) {
    console.error('inside createDeepLink', error);
    return { status: 'error', error };
  }
}, {
  	 fields: [
       'roomId', 
       'muralId',
       'deepLink',
       'sceneId',
       'vrRoomId',
       'muralUrl',
     ],
})

Parse.Cloud.define("generateDeepLink", async (request) => {
    const params = request.params || {};
  	const { AUTH_URL, CLIENT_ID, OCULUS_APP_ID, OCULUS_ACCESS_TOKEN  } = process.env;
  
  	const {"api_name": apiName, "room_id": roomId, "mural_host": muralHost, "mural_ownerId": ownerId, "mural_id": muralId, "mural_state": muralState, jwt, sceneId, "is_facilitator": isFacilitator, vrRoom, roomName: vrRoomName} = params;
  	const muralLink = `${muralHost}/t/${ownerId}/m/${ownerId}/${muralId.split(".")[1]}/${muralState}`;
  	const authLink = `${AUTH_URL}?mural=${muralLink}&auth=${jwt}&type=getAuth&clientId=${CLIENT_ID}`;
  	const messageData = {RoomID: roomId, MuralUrl: muralLink, auth: jwt, clientId: CLIENT_ID, authURL: AUTH_URL, SceneID: sceneId, IsFacilitator: isFacilitator, vrRoom };
  	//if (vrRoomName) {
    	//messageData.vrRoomName = vrRoomName.replace(' ', '|');
    //}
    const message = JSON.stringify(messageData);
  
  	const { data } = await axios({
      method  : "POST",
      url     : `https://graph.oculus.com/${OCULUS_APP_ID}/app_deeplink_public?access_token=${OCULUS_ACCESS_TOKEN}&destination_api_name=${apiName}&valid_for=0&deeplink_message_override=${message}&fields=url`,
  	});
    try {
      if (!jwt || jwt === 'undefined') {
        const deepLinkObj = new Parse.Object(DEEP_LINKS_MODEL);
        deepLinkObj.set('roomId', roomId);
        deepLinkObj.set('muralId', muralId);
        deepLinkObj.set('deepLink', data.url);
        deepLinkObj.set('sceneId', sceneId);
        deepLinkObj.set('muralUrl', muralLink);
        deepLinkObj.set('vrRoomId', {objectId: vrRoom, __type: "Pointer", className: ROOM_MODEL});
        await deepLinkObj.save();
      }
  } catch (e) {
  	console.error('inside generateDeepLink', e);
    return { status: 'error', e };
  }
  var response = {
    "url": data.url, 
    "id": data.id,
    "payload": authLink,
    "debugUrl": `https://graph.oculus.com/${OCULUS_APP_ID}/app_deeplink_public?access_token=${OCULUS_ACCESS_TOKEN}&destination_api_name=${apiName}&valid_for=0&deeplink_message_override=${message}&fields=url`
  };
  return response;
});

Parse.Cloud.define('whitelist', async (request) => {
  try {
    const query = new Parse.Query(WHITELIST_MODEL);

		const users = await query.find({ useMasterKey: true });
    const whitelist = [];
    
    for (const user of users) {
    	whitelist.push(user.get('oculusNameId'))
  	}

    return { status: 'success', result: whitelist };
  } catch (error) {
    console.error('inside whitelist', error);
    return { status: 'error', error };
  }
})

Parse.Cloud.define('getMuralUser', async (request) => {
  const { userId } = request.params;
  try {
    const query = new Parse.Query('User');
 
    query.equalTo("authData.mural.id", userId);
    
    const userRes = await query.first({ useMasterKey: true });
    
    if (!userRes) {
    	return [];
    }
    const user = userRes.toJSON();
    
    return user;
  } catch (error) {
    console.error('inside getMuralUser', error);
    return { status: 'error', error };
  }
}, {
  	fields: ['userId'],
})

Parse.Cloud.define('getUser', async (request) => {
  const { user } = request;
  try {
    const query = new Parse.Query("User");
    query.equalTo("objectId", user.id);
    query.include("authData");

		const userObject = await query.first({ useMasterKey: true });
    const u = userObject.toJSON();
    console.log(u, 'asdasdasdasdasdasdasdasdasdasdasdasd')
    if (!u.authData.mural) {
        return { status: 'error', error: "Not linked to mural account" };
    }
    const authData = { mural: { ...u.authData.mural }  };
    
    const freshToken = await refreshMuralToken(authData.mural.refreshToken);
    
    authData.accessToken = freshToken.access_token;
    authData.refreshToken = freshToken.refresh_token;
    
    await user.linkWith('mural', { authData }, { useMasterKey: true });
    return { status: 'success', result: user.get('sessionToken') };
  } catch (error) {
    console.error('inside getUser', error);
    return { status: 'error', error };
  }
}, {
    requireUser: true,
});

Parse.Cloud.define("roomInfo", async (request) => {
  const query = new Parse.Query(ROOM_MODEL);
  query.equalTo("objectId", request.params.roomId);  
  return { result: await query.first({ useMasterKey: true }), status: 'success' };
},{
  fields : ['roomId'],
});

