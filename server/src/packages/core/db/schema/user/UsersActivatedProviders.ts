import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface ProvidersAttributes {
  id: number;
  ref_id: string;
  user_ref_id: string;
  provider_ref_id: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

class Providers extends Model<ProvidersAttributes> implements ProvidersAttributes {
  public id!: number;

  public ref_id!: string;

  public user_ref_id!: string;

  public provider_ref_id!: string;

  public active!: boolean;

  public created_at!: Date;

  public updated_at!: Date;
}

function initProvidersModel(sequelize: Sequelize) {
  Providers.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.STRING },
      user_ref_id: { type: DataTypes.STRING },
      provider_ref_id: { type: DataTypes.STRING },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'UsersActivatedProviders',
      tableName: 'users_activated_providers',
      underscored: true,
    },
  );

  return Providers;
}

export default initProvidersModel;
