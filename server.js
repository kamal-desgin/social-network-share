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

var socketIo = require("socket.io")(http);
var socketID = "";
var users = [];

var mainURL = "http://localhost:3000";

socketIo.on("connection", function (socket){
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
					"user": [],
						//"_id": user._id,
						"user_id": user._id,
						"name": user.name,
						"profileImage": user.profileImage
			    	
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
					//"_id": {
					"user_id": {
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
	
	/*
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
				
				database.collection("posts")
				.find({
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
	*/
	
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
								"_id": post.user._id
							},{
								$push: {
									"notifications": {
										"_id": ObjectId(),
										"type": "photo_liked",
										"content": user.name + "has liked your phot.",
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
						var commentId = ObjectId;
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
							if(user._id.toString() != post.user._id.toString()){
								database.collection("users").updateOne({
									"_id": post.user._id
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
								"message": "Comment has been posted."
							});
						});
					}
				});
			}
		});
	});
	
		
	});
});
