const mongoose = require('mongoose');
const slug = require('mongoose-slug-generator');
var mongoose_delete = require('mongoose-delete');

mongoose.plugin(slug);

const Schema = mongoose.Schema;

const Course = new Schema(
  {
    name: {
      type: String,
      minlength: 1,
      default: '',
      required: true,
    },
    description: {
      type: String,
      maxlength: 600,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      default: '',
    },
    videoId: {
      type: String,
      default: '',
      required: true,
    },
    level: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      slug: 'name',
      unique: true,
    }, // unique chỉ tồn tại 1 record với value duy nhất
    deleted: {
      type: Boolean,
    },
    deletedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

Course.plugin(mongoose_delete);
Course.plugin(mongoose_delete, {
  deletedAt: true,
  overrideMethods: 'all',
}); // những thằng nào có field deleted:true sẽ không hiện ra & kèm thời gian xóa

module.exports = mongoose.model('Course', Course);
