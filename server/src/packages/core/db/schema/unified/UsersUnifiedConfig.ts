import { Sequelize, DataTypes, Model } from 'sequelize';

interface UsersUnifiedConfigAttributes {
    id: number;
    ref_id: string;
    user_ref_id: string;
    unified_type: string;
    provider: string;
    json_config: { [key: string]: any };
    remark: string;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

class UsersUnifiedConfig
  extends Model<UsersUnifiedConfigAttributes> implements UsersUnifiedConfigAttributes {
  public id!: number;

  public ref_id!: string;

  public user_ref_id!: string;

  public unified_type!: string;

  public provider!: string;

  public json_config!: { [key: string]: any };

  public remark!: string;

  public active!: boolean;

  public created_at!: Date;

  public updated_at!: Date;
}

function init(sequelize: Sequelize) {
  UsersUnifiedConfig.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.STRING },
      user_ref_id: { type: DataTypes.STRING },
      unified_type: { type: DataTypes.STRING },
      provider: { type: DataTypes.STRING },
      json_config: { type: DataTypes.JSON },
      remark: { type: DataTypes.TEXT },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'UsersUnifiedConfig',
      tableName: 'users_unified_config',
      underscored: true,
    },
  );

  return UsersUnifiedConfig;
}

export default init;
