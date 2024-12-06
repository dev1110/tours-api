const { default: mongoose } = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
  active: Boolean,
  name: {
    type: String,
    required: [true, 'Please provide a name']
  },
  email: {
    type: String,
    unique: [true, 'Email id already exists'],
    lowercase: true,
    validate: [isEmail, 'Invalid email id'],
    required: [true, 'Please provide an email address']
  },
  photo: {
    type: String,
    default: 'user.png'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
    validate: [
      {
        validator: function(value) {
          // At least 8 characters
          return value.length >= 8;
        },
        message: 'Password must be at least 8 characters long'
      },
      {
        validator: function(value) {
          // Contains at least one uppercase letter
          return /[A-Z]/.test(value);
        },
        message: 'Password must contain at least one uppercase letter'
      },
      {
        validator: function(value) {
          // Contains at least one number
          return /[0-9]/.test(value);
        },
        message: 'Password must contain at least one number'
      },
      {
        validator: function(value) {
          // Contains at least one special character
          return /[!@#$%^&*(),.?":{}|<>]/.test(value);
        },
        message: 'Password must contain at least one special character'
      }
    ]
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Passwords are not the same'],
    validate: {
      validator: function(el) {
        return el === this.password;
      }
    }
  },
  passwordChangedAt: {
    type: Date,
    select: false
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt?.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = function(candidatePassword, userPassword) {
  return bcrypt?.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimestamp < JWTTimestamp;
  }
  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomUUID();
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
