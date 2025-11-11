import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface UserAttributes {
  id: number;
  ref_id: string;
  entity_id: number;
  email: string;
  password_hash: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  profile_picture: string;
  avatars: { [key: string]: any };
  username: string;
  country_code: string;
  extra: {[key: string]: any };
  email_verified: boolean;
  active: boolean;
  login_at: Date;
  last_login_at: Date;
  created_at: Date;
  updated_at: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number;

  public ref_id!: string;

  public entity_id!: number;

  public email!: string;

  public password_hash!: string;

  public first_name!: string;

  public middle_name!: string;

  public last_name!: string;

  public profile_picture!: string;

  public username!: string;

  public avatars!: { [key: string]: any };

  public country_code!: string;

  public extra!: { [key: string]: any };

  public email_verified!: boolean;

  public active!: boolean;

  public login_at!: Date;

  public last_login_at!: Date;

  public created_at!: Date;

  public updated_at!: Date;
}

function initUserModel(sequelize: Sequelize) {
  User.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.STRING },
      entity_id: { type: DataTypes.INTEGER },
      email: { type: DataTypes.STRING, unique: true, allowNull: false },
      password_hash: { type: DataTypes.STRING },
      first_name: { type: DataTypes.STRING },
      middle_name: { type: DataTypes.STRING },
      last_name: { type: DataTypes.STRING },
      profile_picture: { type: DataTypes.STRING },
      username: { type: DataTypes.STRING },
      avatars: { type: DataTypes.JSON },
      country_code: { type: DataTypes.STRING },
      extra: { type: DataTypes.JSON },
      email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      login_at: { type: DataTypes.DATE },
      last_login_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
    },
  );

  return User;
}

export default initUserModel;
