var express = require("express");
var app = express();

var formidable = require("express-formidable");
app.use(formidable());

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var http = require("http").createServer(app);
var bcrypt = require("bcrypt");
var fileSystem = require("fs");

var jwt = require("jsonwebtoken");
var accessTokenSecret = "myAccessTOkenSecret1234567890";

app.use("/public", express.static(__dirname + "/public"));
app.set("view engine", "ejs");

var socketIO = require("socket.io")(http);
var socketID = "";
var users = [];

var mainURL = "http://localhost:3000";

socketIO.on("connection", function (socket){
	console.log("User connected", socket.id);
	socketID = socket.id;
});

http.listen(3000, function(){
	console.log("Server Started.");
	
	mongoClient.connect("mongodb://localhost:27017", function(error, client){
		var database = client.db("kamal_social_network"); //mongoDB name
		console.log("Database Connected.");
		
		app.get("/signup", function(request, result){
			result.render("signup");
		});
		
		//singup form Register
		app.post("/signup", function (request, result){
			var name = request.fields.name;
			var username = request.fields.username;
			var email = request.fields.email;
			var password = request.fields.password;
			var gender = request.fields.gender;
			
			database.collection("users").findOne({
				$or: [{
					"email": email
				}, {
					"username": username
				}]
			}, function (error, user){
				if(user == null){
					bcrypt.hash(password, 10, function (error, hash){
						database.collection("users").insertOne({
							"name": name,
							"username": username,
							"email": email,
							"password": hash,
							"profileImage": "",
							"coverPhoto": "",
							"dob": "",
							"city": "",
							"country": "",
							"aboutMe": "",
							"friends": [],
							"pages": [],
							"notifications": [],
							"groups": [],
							"posts": []
						}, function (error, data){
							result.json({
								"status": "success",
								"message": "signed up successfully. you can login now."
							});
						});
					});					
				}
				else {
						result.json({
							"status": "error",
							"message": "Email or username already exist."
						});
					}
			});
		});	

		//singup form Login
		app.get("/login", function(request, result){
			result.render("login");
		});
		
		app.post("/login", function(request, result){
			var email = request.fields.email;
			var password = request.fields.password;
			database.collection("users").findOne({
				"email": email
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "Email does not exist"
					});
				} else {
					bcrypt.compare(password, user.password, function (error, isVerify){
						if(isVerify){
							var accessToken = jwt.sign({ email:email }, accessTokenSecret);
							database.collection("users").findOneAndUpdate({
								"email": email
							},{
								$set: {
									"accessToken": accessToken
								}
							}, function (error, data){
								result.json({
									"status": "success",
									"message": "Login Successfully",
									"accessToken": accessToken,
								});
							});
						} else {
							result.json({
								"status": "error",
								"message": "Password is not Correct"
							});
						}
					});
				}
			});
		});
		
		//user Profile page
		app.get("/updateProfile", function(request, result){
			result.render("updateProfile");
		});
		
		//get User Details		
		app.post("/getUser", function(request, result){
			var accessToken = request.fields.accessToken;			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "user has been Logged out. Please login again."
					});
				} else{
					result.json({
						"status": "success",
						"message": "Record has been fetched.",
						"data": user
					});
				}
			});
		});
		
		app.get("/logout", function(request, result){
			result.redirect("/login");
		});
		
		//profile cover photo update
		app.post("/uploadCoverPhoto", function(request, result){
			var accessToken = request.fields.accessToken;
			var coverPhoto = "";
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login  again."
					});
				} else {
					if(request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")){
						//previous cover photo remove
						if(user.coverPhoto != ""){
							fileSystem.unlink(user.coverPhoto, function(error){
								
							});
						}
						coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
						fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function(error){
							
						});
						database.collection("users").updateOne({
								"accessToken": accessToken
							}, {
								$set: {
									"coverPhoto": coverPhoto
								}
						}, function(error, data){
							result.json({
								"status": "status",
								"message": "Cover photo has been updated.",
								"data": mainURL + "/" + coverPhoto
							});
						});							
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});			
		});
		
		//profile image update
		app.post("/uploadProfileImage", function(request, result){
			var accessToken = request.fields.accessToken;
			var profileImage = "";
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login  again."
					});
				} else {
					if(request.files.profileImage.size > 0 && request.files.profileImage.type.includes("image")){
						//previous cover photo remove
						if(user.profileImage != ""){
							fileSystem.unlink(user.profileImage, function(error){
								
							});
						}
						profileImage = "public/images/" + new Date().getTime() + "-" + request.files.profileImage.name;
						fileSystem.rename(request.files.profileImage.path, profileImage, function(error){
							
						});
						database.collection("users").updateOne({
								"accessToken": accessToken
							}, {
								$set: {
									"profileImage": profileImage
								}
						}, function(error, data){
							result.json({
								"status": "status",
								"message": "Profile image has been updated.",
								"data": mainURL + "/" + profileImage
							});
						});							
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});			
		});
		
	//update profile		
	app.post("/updateProfile", function(request, result){
		var accessToken = request.fields.accessToken;
		var name = request.fields.name;
		var dob = request.fields.dob;
		var city = request.fields.city;
		var country = request.fields.country;
		var aboutMe = request.fields.aboutMe;
		
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function(error, user){
			if(user == null){
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login aagain."
				});
			} else {
				database.collection("users").updateOne({
					"accessToken": accessToken
				},{
					$set: {
						"name": name,
						"dob": dob,
						"city": city,
						"country": country,
						"aboutMe": aboutMe
					}
				}, function(error, data){
					result.json({
						"status": "status",
						"message": "Profile has been updated."
					});
				});
			}
		});
	});
	
	//home page
	app.get("/", function(request, result){
		result.render("index");
	}); 

	//home page post
	app.post("/addPost", function(request, result){
		var accessToken = request.fields.accessToken;
		var caption = request.fields.caption;
		var image = "";
		var video = "";
		var type = request.fields.type;
		var createdAt = new Date().getTime();
		var _id = request.fields._id;
		
		database.collection("users").findOne({
			"accessToken":  accessToken
		}, function(error, user){
			if(user == null){
				result.json({
					"status": "error",
					"message": "User has been Logged out. Please login again."
				});
			} else {
				if(request.files.image.size > 0 && request.files.image.type.includes("image")){
					image = "public/images/" + new Date().getTime() + "-" + request.files.image.name;
					fileSystem.rename(request.files.image.path, image, function(error){
						
					});
				}
				if(request.files.video.size > 0 && request.files.video.type.includes("video")){
					video = "public/videos/" + new Date().getTime() + "-" + request.files.video.name;
					fileSystem.rename(request.files.video.path, video, function(error){
						
					});
				}
				//create post 
				database.collection("posts").insertOne({
					"caption": caption,
					"image": image,
					"video": video,
					"type": type,
					"createdAt": createdAt,
					"likers": [],
					"comments": [],
					"shares": [],
					"user": {
						"_id": user._id,
						"name": user.name,
						"profileImage": user.profileImage
					}
			    	
				}, function(error, data){
					database.collection("users").updateOne({
						"accessToken": accessToken
					}, {
						$push: {
							"posts": {
								"_id": data.insertedId,
								"caption": caption,
								"image": image,
								"video": video,
								"type": type,
								"createdAt": createdAt,
								"likers": [],
								"comments": [],
								"shares": []
							 }
						}
					},function(error, data){
						result.json({
							"status": "success",
							"message": "Post has been Uploaded."
						});
					});
				});
			}
		});
	});

	//get news feed
	app.post("/getNewsfeed", function(request, result) {
		var accessToken = request.fields.accessToken;
		
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function(error, user){
			if(user == null){
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."				
				});
			} else {				
				var ids = [];
				ids.push(user._id);				
				/* var username = [];
				username.push(user.name); */				
				database.collection("posts").find({					
					"user._id": {
						$in: ids
					}
				})
				.sort({
					"createdAt": -1
				})
				.limit(5)
				.toArray(function(error, data){
					
					result.json({
						"status": "success",
						"message": "Record has been fetched",						
						"data": data
					});					
				});			
			}
		});
	});
	
	//like section
	app.post("/toggleLikePost", function(request, result){
		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function(error, user){
			if(user == null){
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {
				database.collection("posts").findOne({
					"_id": ObjectId(_id)
				}, function(error, post){
					if(post == null){
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else {
						var isLiked = false;
						for(var a = 0; a < post.likers.length; a++){
							var liker = post.likers[a];
							
							if(liker._id.toString() == user._id.toString()){
								isLiked = true;
								break;
							}
						}
						if(isLiked){
							database.collection("posts").updateOne({
								"_id":ObjectId(_id)
							},{
								$pull:{
									"likers":{
										"_id": user._id,
									}
								}
							}, function(error, data){
								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									},{
										"post._id": post._id
									}]
								},{
									$pull: {
										"posts.$[].likers": {
											"_id": user._id,
										}
									}
								});
								
								result.json({
									"status": "unliked",
									"message": "Post has been Unliked."
								});
							})
						} else{
							database.collection("users").updateOne({
								"_id": user._id
							},{
								$push: {
									"notifications": {
										"_id": ObjectId(),
										"type": "photo_liked",
										"content": user.name + " has liked your photo.",
										"profileImage": user.profileImage,
										"createdAt": new Date().getTime()
									}
								}
							});
							
							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"likers": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage
									}
								}
							}, function(error, data){
								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									},{
										"posts._id": post._id
									}]
								},{
									$push: {
										"posts.$[].likers": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage
										}
									}
								});
								
								result.json({
									"status": "success",
									"message": "Post has been liked."
								});
							});
						}
					}
				});
			}
		});
	});
	
	//comment section
	app.post("/PostComment", function(request, result){
		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		var comment = request.fields.comment;
		var createdAt = new Date().getTime();
		
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function(error, user){
			if(user == null){
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {
				database.collection("posts").findOne({
					"_id": ObjectId(_id)
				}, function(error, post){
					if(post == null){
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else{
						var commentId = ObjectId();
						database.collection("posts").updateOne({
							"_id": ObjectId(_id)
						},{
							$push: {
								"comments": {
									"_id": commentId,
									"user": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage,
									},
									"comment": comment,
									"createdAt": createdAt,
									"replies": []
								}
							}
						}, function(error, data){
							//check post id and user id not equal
							if(user._id.toString() != user._id.toString()){
								database.collection("users").updateOne({
									"_id": user._id
								},{
									$push: {
										"notifications": {
											"_id": ObjectId(),
											"type": "new_comment",
											"content": user.name + " commented on your post.",
											"profileImage": user.profileImage,
											"createdAt": new Date().getTime()
										}
									}
								});
							}
							database.collection("users").updateOne({
								$and: [{
									"_id": post.user._id
								},{
									"posts._id": post._id
								}]
							},{
								$push: {
									"posts.$[].comments": {
										"_id": commentId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"comment": comment,
										"createdAt": createdAt,
										"replies": []
									}
								}
							});
							result.json({
								"status": "success",
								"message": "Comment has been posted.",
							});
						});
					}
				});
			}
		});
	});
	
	//reply comment section
	app.post("/postReply", function(request, result){
		var accessToken = request.fields.accessToken;
		var postId = request.fields.postId;
		var commentId = request.fields.commentId;
		var reply = request.fields.reply;
		var createdAt = new Date().getTime();
		
		database.collection("users").findOne({
			"accessToken": accessToken
		},function(error, user){
			if(user == null){
				result.json({
					"status": "error",
					"message": "User has been logged ouot. Please login again."
				});
			} else {
				database.collection("posts").findOne({
					"_id": ObjectId(postId)
				}, function(error, post){
					
					if(post == null){
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else {
						var replyId = ObjectId();
						database.collection("posts").updateOne({
							$and: [{
								"_id": ObjectId(postId) 
							},{
								"comments._id": ObjectId(commentId) 
							}]
						},{
							$push: {
								"comments.$.replies": {
									"_id": replyId, 
									"user": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage,
									},
									"reply": reply,
									"createdAt": createdAt
								}
							}
						},function(error, data){
							database.collection("users").updateOne({
								$and: [{
									"_id": post.user._id
								},{
									"posts._id": post._id
								},{
									"posts.comments._id": ObjectId(commentId)
								}]
							},{
								$push: {
									"posts.$[].comments.$[].replies": {
										"_id": replyId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"reply": reply,
										"createdAt": createdAt
									}
								}
							});							
							result.json({
								"status": "success",
								"message": "Reply has been posted.",
							});
						});						
					}
				});
			}
		});
	}); 
	
	//share Post
	app.post("/sharePost", function(request, result){
			
		var accessToken = request.fields.accessToken;
		var _id = request.fields._id;
		var type = "shared";
		var createdAt = new Date().getTime();
		
		database.collection("users").findOne({
			"accessToken": accessToken
		}, function(error, user){
			if(user == null){
				result.json({
					"status": "error",
					"message": "User has been logged out. Please login again."
				});
			} else {
				database.collection("posts").findOne({
					"_id": ObjectId(_id)
				}, function(error, post){
					if(post == null){
						result.json({
							"status": "error",
							"message": "Post does not exist."
						});
					} else {
						database.collection("posts").updateOne({
							"_id": ObjectId(_id)
						},{ 
							$push: {
								"shares": {
									"_id": user._id,
									"name": user.name,
									"profileImage": user.profileImage
								}
							}
						}, function(error, data){
							database.collection("posts").insertOne({
								"caption": post.caption,
								"image": post.image,
								"video": post.video,
								"type": type,
								"createdAt": createdAt,
								"likers": [],
								"comments": [],
								"shares": [],
								"user":{
									"_id": user._id,
									"name": user.name,
									"gender": user.gender,
									"profileImage": user.profileImage
								}
							}, function(error, data){
								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									},{
										"posts._id": post._id
									}]
								},{
									$push: {
										"posts.$[].shares": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage
										}
									}
								});
								result.json({
									"status": "success",
									"message": "Post has been shared.",
								});
							});
						});
					}
				});
			}
		});
	});
	
	 
	
		//search function
		app.get("/search/:query", function(request, result){
			var query = request.params.query;
			result.render("search", {
				"query": query
			});
		});
		
		app.post("/search", function(request, result){
			var query = request.fields.query;
			database.collection("users").find({
				"name":{
					$regex: ".*" + query + ".*",
					$options: "i"
				} 
			}).toArray(function(error, data){
				result.json({
					"status": "success",
					"message": "Record has been fetched",
					"data": data
				});
			});
		});
		
		
		/* post-user-id:"5edcbf1db6d678158c9a0ddd",
		    post-id:"5ef0214368d0602018f8c07d"
	
	5edcbf1db6d678158c9a0ddd //user-id
	5eed7b9f866eff3d200c32ed //post-id
	
	alert('post-user-id:' + JSON.stringify(response.post_user_id));
	alert('post-id:' + JSON.stringify(response.post_id));
	"post_user_id": user._id, //check userid
	"post_id":  post._id, //check postid
	
	
				var username = [];
				username.push(user.name); 				
				database.collection("posts").find({					
					"user._id": {
						$in: ids
					}
				})
	*/
		//friend Request send
		app.post("/sendFriendRequest", function(request, result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again"
					});
				} else {
					var me = user;
					database.collection("users").findOne({
						"_id": ObjectId(_id)
					}, function(error, user){
						if(user == null){
							result.json({
								"status": "error",
								"message": "user does not exist."
							});							
						} else {
							database.collection("users").updateOne({
								"_id": ObjectId(_id)
							},{
								$push: {
									"friends":{
										"_id": me._id,
										"name": me.name,
										"profileImage": me.profileImage,
										"status": "Pending",
										"sentByMe": false,
										"inbox": []
									}
								}
							}, function(error, data){
								database.collection("users").updateOne({
									"_id": me._id
								}, {
									$push:{
										"friends": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
											"status": "Pending",
											"sentByMe": true,
											"inbox": []
										}
									}
								}, function(error, data){
									result.json({
										"status": "success",
										"message": "Friend request has been sent."
									});
								});
							});
						}
					});
				}
			});			
		});
		
		//friend request accepted section
		app.get("/friends", function(request, result){
			result.render("friends");
		});
		
		app.post("/acceptFriendRequest", function(request, result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error" ,
						"message": "User has been logged out. Please login again."						
					});
				} else {
					var me = user;
					database.collection("users").findOne({
						"_id": ObjectId(_id)
					}, function(error, user){
						if(user == null){
							result.json({
									"status": "error" ,
									"message": "User does not exist."						
								});
						} else {
							database.collection("users").updateOne({
								"_id": ObjectId(_id)
							},{
								$push: {
									"notifications": {
										"_id": ObjectId(),
										"type": "friend_request_accepted",
										"content": me.name + "accepted your friend request.",
										"profileImage": me.profileImage,
										"createdAt": new Date().getTime()
									}
								}
							});
							
							database.collection("users").updateOne({
								$and: [{
									"_id": ObjectId(_id)
								},{
									"friends._id": me._id
								}]
							},{
								$set: {
									"friends.$.status": "Accepted"
								}
							}, function(error, data){
								database.collection("users").updateOne({
									$and: [{
										"_id": me._id
									},{
										"friends._id": user._id
									}]
								},{
									$set:{
										"friends.$.status": "Accepted"
									}
								}, function(error, data){
									result.json({
										"status": "success",
										"message": "Friend request has been accepted."
									});
								});
							});
						}
					});
				}
			});
		});
		
		//friend request Unfriend section
		app.post("/unfriend", function(request, result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error" ,
						"message": "User has been logged out. Please login again."						
					});
				} else {
					var me = user;
					database.collection("users").findOne({
						"_id": ObjectId(_id)
					}, function(error, user){
						if(user == null){
							result.json({
									"status": "error" ,
									"message": "User does not exist."						
								});
						} else {
							database.collection("users").updateOne({
								"_id": ObjectId(_id)
							},{
								$pull: {
									"friends": {
										"_id": me._id
									}
								}
							}, function(error, data){
								database.collection("users").updateOne({
									"_id": me._id
								},{
									$pull: {
										"friends": {
											"_id": user._id
										}
									}
								}, function(error, data){
									result.json({
										"status": "success",
										"message": "Friend has been removed."
									});
								});
							});
						}
					});
				}
			});
		});
		
		//chat section		
		app.get("/inbox", function(request, result){
			result.render("inbox");
		})
		
		app.post("/getFriendsChat", function(request, result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged Out. Please login again."
					});
				} else{
					var index = user.friends.findIndex(function(friend){
						return friend._id == _id
					});
					
					var inbox = user.friends[index].inbox;					
					result.json({
						"status": "success",
						"message": "Record has been fetched",
						"data": inbox
					});
				}
			});
		});
		
		
		app.post("/sendMessage", function(request, result){
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var message = request.fields.message;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "user has been logged out. Please login again."
					});
				} else {
					
					var me = user;
					database.collection("users").findOne({
						"_id": ObjectId(_id)
					}, function(error, user){
						if(user == null){
							result.json({
								"status": "error",
								"message": "User does not exist."
							});
						} else {
							database.collection("users").updateOne({
								$and:[{
									"_id": ObjectId(_id)
								},{
									"friends._id": me._id
								}]
							},{
								$push: {
									"friends.$.inbox":{
										"_id": ObjectId(),
										"message": message,
										"from": me._id
									}
								}
							}, function(error, data){
								database.collection("users").updateOne({
									$and: [{
										"_id": me._id
									},{
										"friends._id": user._id
									}]
								},{
									$push: {
										"friends.$.inbox": {
											"_id": ObjectId(),
											"message": message,
											"from": me._id
										}
									}
								}, function(error, data){		
									//below socketIO connected	
									socketIO.to(users[user._id]).emit("messageReceived", {
										"message": message,
										"from": me._id
									});									
									result.json({
										"status": "success",
										"message": "Message had been sent."
									});
								});
							});
						}
					});
				}
			});
		});
		
		//socketIO connect
		app.post("/connectSocket", function(request, result){
			var accessToken = request.fields.accessToken;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "user has been logged out. Please login again."
					});
				} else {
					users[user._id] = socketID;
					result.json({
						"status": "status",
						"message": "socket has been connected."
					});
				}
			});
		});
		
	});
});
