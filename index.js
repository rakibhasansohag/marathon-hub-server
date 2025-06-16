const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 5000;

// Initialize Firebase Admin
const serviceAccount = require('./firebase-config.json');
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

// Point : Middleware
app.use(
	cors({
		origin: ['http://localhost:3000', 'http://localhost:5173'],
		credentials: true,
	}),
);
app.use(express.json());

app.get('/', (req, res) => res.send('🌿 Marathon Hub Server is up!'));

const client = new MongoClient(process.env.MONGODBURL, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

// verify firebase token
async function verifyFirebaseToken(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader?.startsWith('Bearer ')) {
		return res.status(401).send({ message: 'Unauthorized Access' });
	}
	const token = authHeader.split(' ')[1];

	try {
		const decoded = await admin.auth().verifyIdToken(token);
		req.decoded = decoded; // contains uid, email, etc.
		next();
	} catch {
		res.status(401).send({ message: 'Unauthorized Access' });
	}
}

async function run() {
	try {
		await client.connect();
		// Point: Collections
		const MarathonsUserCollections = client
			.db('marathonBD')
			.collection('marathonUsers');
		const MarathonsListCollections = client
			.db('marathonBD')
			.collection('marathonsList');
		const MarathonRegistrationCollection = client
			.db('marathonBD')
			.collection('marathonRegistrations');

		// Send a ping to confirm a successful connection
		await client.db('admin').command({ ping: 1 });
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!',
		);

		// Point — Marathon Users CRUD —
		// Create a User
		app.post('/marathonUser', async (req, res) => {
			const newMarathonUser = req.body;
			if (!newMarathonUser.uid) {
				return res.status(400).send({ error: 'UID is required' });
			}

			// for duplicated users
			const filter = { uid: newMarathonUser.uid };
			const update = {
				$set: { ...newMarathonUser, location: '', bloodGroup: '', address: '' },
			};
			const options = { upsert: true };

			const result = await MarathonsUserCollections.updateOne(
				filter,
				update,
				options,
			);
			return res.send(result);
		});

		// Read all Users
		app.get('/marathonUser', async (req, res) => {
			const { status, limit } = req.query;
			let query = {};
			if (status) {
				query.status = status;
			}
			let cursor = MarathonsUserCollections.find(query);
			if (limit) {
				cursor = cursor.limit(parseInt(limit));
			}
			const result = await cursor.toArray();
			res.send(result);
		});

		// Read single User
		app.get('/marathonUser/:uid', verifyFirebaseToken, async (req, res) => {
			try {
				const uid = req.params.uid;
				if (req.decoded.uid !== uid) {
					return res.status(403).send({
						message: 'Forbidden: You can only access your own profile',
					});
				}

				const marathonUser = await MarathonsUserCollections.findOne({
					uid: uid,
				});

				if (!marathonUser) {
					return res.status(404).send({ error: 'MarathonUser not found' });
				}
				res.send(marathonUser);
			} catch (error) {
				console.error('Error fetching marathonUser:', error);
				res.status(500).send({ error: 'Internal server error' });
			}
		});

		// Update a User
		app.put('/marathonUser/:uid', verifyFirebaseToken, async (req, res) => {
			try {
				const uid = req.params.uid;
				if (req.decoded.uid !== uid) {
					return res.status(403).send({
						message: 'Forbidden: You can only access your own profile',
					});
				}
				const updated = req.body;
				const result = await MarathonsUserCollections.updateOne(
					{ uid },
					{ $set: updated, $currentDate: { lastUpdated: true } },
					{ upsert: false },
				);
				res
					.status(200)
					.send({ message: 'Profile updated successfully', result });
			} catch (error) {
				console.error('Error updating marathonUser:', error);
				res.status(500).send({ error: 'Internal server error' });
			}
		});

		// Delete a user with highest power
		app.delete('/marathonUser/:id', async (req, res) => {
			const id = req.params.id;
			const result = await MarathonsUserCollections.deleteOne({
				_id: new ObjectId(id),
			});
			res.send(result);
		});

		// Point: Marathons CRUD Operations
		// Add A Marathon Event
		app.post('/marathons', async (req, res) => {
			const marathon = req.body;
			marathon.userId = marathon?.userId || null;
			marathon.TotalRegistrationUsers = [];
			marathon.createdAt = new Date();
			const result = await MarathonsListCollections.insertOne(marathon);
			res.send(result);
		});

		// Get All Marathons
		app.get('/marathons', async (req, res) => {
			const { status, limit, sort, search } = req.query;
			let query = {};

			// handle status filter
			if (status) {
				query.status = status;
			}

			// handle search filter
			if (search) {
				query.$or = [{ title: { $regex: search, $options: 'i' } }];
			}

			let cursor = MarathonsListCollections.find(query);

			// handle sorting
			if (sort === 'oldest') {
				cursor = cursor.sort({ createdAt: 1 });
			} else {
				cursor = cursor.sort({ createdAt: -1 });
			}

			if (limit) {
				cursor = cursor.limit(parseInt(limit));
			}

			try {
				const result = await cursor.toArray();
				res.send(result);
			} catch (error) {
				console.error('Error fetching marathons:', error);
				res.status(500).send({ error: 'Internal server error' });
			}
		});

		// Get SIngle marathon
		// Get Single Marathon by ID
		app.get('/marathons/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const marathon = await MarathonsListCollections.findOne({
					_id: new ObjectId(id),
				});

				if (!marathon) {
					return res.status(404).json({ message: 'Marathon not found' });
				}

				res.send(marathon);
			} catch (err) {
				console.error('Error fetching marathon:', err);
				res.status(500).json({ message: 'Internal server error' });
			}
		});

		// // update a marathon data
		app.put('/marathons/:id', async (req, res) => {
			try {
				const uid = req.params.uid;
				const updated = req.body;
				const result = await MarathonsListCollections.updateOne(
					{ uid },
					{ $set: updated },
					{ upsert: false },
				);
				res.send(result);
			} catch (err) {
				console.error(err);
				res.status(500).json({ error: 'Update failed' });
			}
		});

		// Delete a marathon data
		app.delete('/marathons/:id', async (req, res) => {
			const id = req.params.id;
			const result = await MarathonsListCollections.deleteOne({
				_id: new ObjectId(id),
			});
			res.send(result);
		});

		// my marathons
		app.get('/my-marathons', verifyFirebaseToken, async (req, res) => {
			const uid = req.query.userId;
			console.log(uid);

			if (!uid) {
				return res.status(400).send({ message: 'User ID is required' });
			}

			const query = {
				userId: uid,
			};

			const marathons = await MarathonsListCollections.find(query).toArray();
			res.send(marathons);
		});

		// to check the registration
		app.get('/registration/check', async (req, res) => {
			const { marathonId, uid } = req.query;

			console.log(uid, marathonId);

			if (!uid || !marathonId) {
				return res
					.status(400)
					.json({ registered: false, message: 'Missing query params' });
			}

			const exists = await MarathonRegistrationCollection.findOne({
				marathonId,
				uid,
			});
			res.json({ registered: !!exists });
		});

		// Point:  Registration related  api
		app.post('/registration', async (req, res) => {
			const {
				marathonId,
				marathonTitle,
				marathonStartDate,
				firstName,
				lastName,
				contact,
				info,
				uid,
				bloodGroup,
				address,
				age,
				bio,
				startRegDate,
				endRegDate,
				marathon,
				email,
			} = req.body;

			if (!uid || !marathonId || !contact) {
				return res.status(400).json({ message: 'Missing required fields ' });
			}

			// Check if already registered
			const existing = await MarathonRegistrationCollection.findOne({
				marathonId,
				email,
				uid,
			});
			if (existing) {
				return res.status(409).json({ message: 'Already registered' });
			}

			const newEntry = {
				marathonId,
				email,
				title: marathonTitle,
				marathonStartDate: new Date(marathonStartDate),
				firstName,
				lastName,
				contact,
				info,
				createdAt: new Date(),
				uid,
				bloodGroup,
				address,
				age: parseInt(age) || null,
				bio,
				userId: uid,
				startRegDate: new Date(startRegDate),
				endRegDate: new Date(endRegDate),
				distance: marathon.distance,
				category: marathon.category,
				totalRegistration: marathon.totalRegistration,
				imageUrl: marathon.imageUrl,
				marathon,
			};

			const result = await MarathonRegistrationCollection.insertOne(newEntry);

			// Increment the total registration in marathonsList collection
			await MarathonsListCollections.updateOne(
				{ _id: new ObjectId(marathonId) },
				{ $inc: { totalRegistration: 1 } },
			);

			// all added total register user  to the marathon list
			await MarathonsListCollections.updateOne(
				{ _id: new ObjectId(marathonId) },
				{ $addToSet: { registeredUsers: uid } },
			);

			res.status(201).json(result);
		});

		// my apply-marathon-list
		app.get('/my-apply-marathons', verifyFirebaseToken, async (req, res) => {
			const userId = req.query.userId;
			const { sort, order, search } = req.query;
			if (!userId) {
				return res.status(400).send({ message: 'User ID is required' });
			}

			let query = { userId: userId };
			if (search) {
				query.title = { $regex: search, $options: 'i' };
			}

			let cursor = MarathonRegistrationCollection.find(query);

			if (sort && order) {
				const sortOrder = order === 'asc' ? 1 : -1;

				const sortField =
					{
						title: 'title',
						startDate: 'marathonStartDate',
						registration: 'totalRegistration',
					}[sort] || 'title';
				cursor = cursor.sort({ [sortField]: sortOrder });
			}

			const applications = await cursor.toArray();

			res.send(applications);
		});

		// update my apply marathons data
		app.put('/my-apply-marathons/:id', async (req, res) => {
			const registrationId = req.params.id;

			const updatedData = req.body;

			try {
				const result = await MarathonRegistrationCollection.updateOne(
					{ _id: new ObjectId(registrationId) },
					{ $set: updatedData },
				);

				if (result.matchedCount === 0) {
					return res.status(404).send({ message: 'Registration not found' });
				}

				res.send(result);
			} catch (error) {
				console.error('Error updating registration:', error);
				res.status(500).send({
					message: 'Failed to update registration',
					error: error.message,
				});
			}
		});

		// delete my marathon
		app.delete('/my-apply-marathons/:id', async (req, res) => {
			const id = req.params.id;
			const marathonId = req.query.marathonId;

			if (!id) {
				return res.status(400).send({ message: 'Registration ID is required' });
			}

			// also remove the total participants from the marathon list
			if (marathonId) {
				// Check if marathonId was provided
				try {
					await MarathonsListCollections.updateOne(
						{ _id: new ObjectId(marathonId) },
						{ $inc: { totalRegistration: -1 } },
					);
				} catch (updateError) {
					console.error(
						'Error updating marathon totalRegistration:',
						updateError,
					);
				}
			}

			try {
				const result = await MarathonRegistrationCollection.deleteOne({
					_id: new ObjectId(id),
				});

				if (result.deletedCount === 0) {
					return res.status(404).send({ message: 'Registration not found' });
				}

				res.send(result);
			} catch (deleteError) {
				console.error('Error deleting marathon registration:', deleteError);
				res.status(500).send({ message: 'Failed to delete registration' });
			}
		});
	} catch (error) {
		console.log(`error connecting to mongoDB ${error}`);
	} finally {
		//  await client.close();
	}
}
run().catch(console.dir);

app.listen(port, () => {
	console.log(`Garden Hub server is running on port: ${port}`);
});
