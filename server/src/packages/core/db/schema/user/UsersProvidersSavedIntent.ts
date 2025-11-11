import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface UsersProvidersSavedIntentAttributes {
  id: number;
  user_ref_id: string;
  provider: string;
  method: string;
  intent: string;
  path: string;
  saved_mode: string;
  created_at: Date;
  updated_at: Date;
}

class UsersProvidersSavedIntent
  extends Model<UsersProvidersSavedIntentAttributes>
  implements UsersProvidersSavedIntentAttributes {
  public id!: number;

  public user_ref_id!: string;

  public provider!: string;

  public method!: string;

  public intent!: string;

  public path!: string;

  public saved_mode!: string;

  public created_at!: Date;

  public updated_at!: Date;
}

function init(sequelize: Sequelize) {
  UsersProvidersSavedIntent.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_ref_id: { type: DataTypes.STRING, allowNull: false },
      provider: { type: DataTypes.STRING, allowNull: false },
      method: { type: DataTypes.STRING, allowNull: false },
      intent: { type: DataTypes.STRING, allowNull: false },
      path: { type: DataTypes.STRING, allowNull: false },
      saved_mode: { type: DataTypes.STRING, allowNull: false, defaultValue: 'fav' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'UsersProvidersSavedIntent',
      tableName: 'users_providers_saved_intents',
      underscored: true,
    },
  );

  return UsersProvidersSavedIntent;
}

export default init;
