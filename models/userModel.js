const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'the user must have a name'],
  },
  email: {
    type: String,
    required: [true, 'the user must hava a email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please enter a valid email'],
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lider-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'the user must have a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'the user must have a confirm password'],
    //this only work on create() and save()
    validate: {
      validator: function (el) {
        return this.password === el;
      },
      message: 'the password confirm not equal to password',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//document middelware
userSchema.pre('save', async function (next) {
  //only run this function if password field modified
  if (!this.isModified('password')) return next();

  //hashe the password with cost 12
  this.password = await bcrypt.hash(this.password, 12);

  //delete the password confirm field
  this.passwordConfirm = undefined;
  next();
});

//document middelware
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//query middelware
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimdesstamp) {
  if (this.passwordChangedAt) {
    const passwordChangeAtTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    //check the issued date less than passwordChangedAt
    return passwordChangeAtTimestamp >= JWTTimdesstamp;
  }
  //false means not change
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
