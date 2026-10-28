import mongoose from 'mongoose';
import mongooseSlugUpdater from 'mongoose-slug-updater';
import mongooseDelete from 'mongoose-delete';

mongoose.plugin(mongooseSlugUpdater);

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
      slug: 'name', // tu dong tao slug tu field 'name' (mongoose-slug-updater)
      unique: true,
    }, // unique chi ton tai 1 record voi value duy nhat
    deleted: {
      type: Boolean,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // tu dong tao createdAt & updatedAt
  },
);

Course.plugin(mongooseDelete);
Course.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: 'all',
}); // nhung document co field deleted:true se khong hien ra & kem thoi gian xoa

export default mongoose.model('Course', Course);
