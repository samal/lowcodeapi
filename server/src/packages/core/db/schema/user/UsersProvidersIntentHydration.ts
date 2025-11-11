import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface UsersProvidersIntentHydrationAttributes {
  id: number;
  user_ref_id: string;
  name: string;
  provider: string;
  method: string;
  intent: string;
  body: {[key: string]: any };
  query_params: {[key: string]: any };
  path_params: {[key: string]: any };
  headers: {[key: string]: any };
  created_at: Date;
  updated_at: Date;
}

class UsersProvidersIntentHydration
  extends Model<UsersProvidersIntentHydrationAttributes>
  implements UsersProvidersIntentHydrationAttributes {
  public id!: number;

  public user_ref_id!: string;

  public name!: string;

  public provider!: string;

  public method!: string;

  public intent!: string;

  public body!: { [key: string]: any };

  public query_params!: { [key: string]: any };

  public path_params!: { [key: string]: any };

  public headers!: { [key: string]: any };

  public created_at!: Date;

  public updated_at!: Date;
}

function init(sequelize: Sequelize) {
  UsersProvidersIntentHydration.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_ref_id: { type: DataTypes.STRING, allowNull: false },
      provider: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: true },
      method: { type: DataTypes.STRING, allowNull: false },
      intent: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.JSON },
      query_params: { type: DataTypes.JSON },
      path_params: { type: DataTypes.JSON },
      headers: { type: DataTypes.JSON },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'UsersProvidersIntentHydration',
      tableName: 'users_providers_intent_hydration',
      underscored: true,
    },
  );

  return UsersProvidersIntentHydration;
}

export default init;
