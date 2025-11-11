import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface UsersAPITokenAttributes {
  id: number;
  ref_id: string;
  user_ref_id: string;
  api_token: string;
  api_token_credits: number;
  api_credit_consumed: number;
  last_used: Date;
  api_token_expiry: number;
  api_token_config: { [key: string]: any };
  remark: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

class UsersAPIToken extends Model<UsersAPITokenAttributes> implements UsersAPITokenAttributes {
  public id!: number;

  public ref_id!: string;

  public user_ref_id!: string;

  public api_token!: string;

  public api_token_credits!: number;

  public api_credit_consumed!: number;

  public last_used!: Date;

  public api_token_expiry!: number;

  public api_token_config!: { [key: string]: any };

  public remark!: string;

  public active!: boolean;

  public created_at!: Date;

  public updated_at!: Date;
}

function initUsersAPITokenModel(sequelize: Sequelize) {
  UsersAPIToken.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.STRING },
      user_ref_id: { type: DataTypes.STRING },
      api_token: { type: DataTypes.STRING },
      api_token_credits: { type: DataTypes.INTEGER },
      api_credit_consumed: { type: DataTypes.INTEGER },
      last_used: { type: DataTypes.DATE },
      api_token_expiry: { type: DataTypes.INTEGER, defaultValue: 90 },
      api_token_config: { type: DataTypes.JSON },
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
      modelName: 'UsersAPIToken',
      tableName: 'users_api_tokens',
      underscored: true,
    },
  );

  return UsersAPIToken;
}

export default initUsersAPITokenModel;
