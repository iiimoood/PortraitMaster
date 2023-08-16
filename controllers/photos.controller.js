const Photo = require('../models/photo.model');
const sanitize = require('mongo-sanitize');
const requestIp = require('request-ip');
const Voter = require('../models/Voter.model');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if (title && author && email && file) {
      // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];

      if (fileExt !== 'jpg' || fileExt !== 'png' || fileExt !== 'gif') {
        throw new Error('Wrong file extension!');
      }

      const newPhoto = new Photo({
        title: sanitize(title),
        author: sanitize(author),
        email: sanitize(email),
        src: fileName,
        votes: 0,
      });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);
    } else {
      throw new Error('Wrong input!');
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoId = req.params.id;
    const ip = requestIp.getClientIp(req);

    let voter = await Voter.findOne({ user: ip });

    if (!voter) {
      voter = new Voter({
        user: ip,
        votes: [photoId],
      });
    } else {
      if (voter.votes.includes(photoId)) {
        return res
          .status(500)
          .json({ message: 'You have already voted for this photo' });
      }

      voter.votes.push(photoId);
    }
    await voter.save();

    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });
    }
  } catch (err) {
    res.status(500).json(err);
  }
};
