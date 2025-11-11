import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface LogRequestAttributes {
  id: number;
  ref_id: string,
  user_ref_id: string;
  service_type: string;
  provider: string;
  via_provider: string;
  method: string;
  intent: string;
  path: string;
  api_endpoint: string;
  payload: { [key: string]: any };
  response: { [key: string]: any };
  client_ip: string;
  status_code: number;
  client_headers: { [key: string]: any };
  response_headers: { [key: string]: any };
  is_error: boolean;
  error: { [key: string]: any };
  trace: { [key: string]: any };
  started_at: Date;
  completed_at: Date;
  created_at: Date;
  updated_at: Date;
}

class LogRequest extends Model<LogRequestAttributes> implements LogRequestAttributes {
  public id!: number;

  public ref_id!: string;

  public user_ref_id!: string;

  public service_type!: string;

  public provider!: string;

  public via_provider!: string;

  public method!: string;

  public intent!: string;

  public path!: string;

  public api_endpoint!: string;

  public status_code!: number;

  public payload!: { [key: string]: any };

  public response!: { [key: string]: any };

  public client_ip!: string;

  public client_headers!: { [key: string]: any };

  public response_headers!: { [key: string]: any };

  public is_error!: boolean;

  public error!: { [key: string]: any };

  public trace!: { [key: string]: any };

  public started_at!: Date;

  public completed_at!: Date;

  public created_at!: Date;

  public updated_at!: Date;
}

function init(sequelize: Sequelize) {
  LogRequest.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.STRING, allowNull: false },
      user_ref_id: { type: DataTypes.STRING, allowNull: false },
      service_type: { type: DataTypes.STRING },
      provider: { type: DataTypes.STRING, allowNull: false },
      via_provider: { type: DataTypes.STRING, allowNull: false },
      method: { type: DataTypes.STRING, allowNull: false },
      intent: { type: DataTypes.STRING, allowNull: false },
      path: { type: DataTypes.STRING, allowNull: false },
      api_endpoint: { type: DataTypes.STRING, allowNull: false },
      status_code: { type: DataTypes.NUMBER, allowNull: false },
      payload: { type: DataTypes.JSON, allowNull: false },
      response: { type: DataTypes.JSON, allowNull: false },
      client_ip: { type: DataTypes.STRING, allowNull: false },
      client_headers: { type: DataTypes.JSON, allowNull: false },
      response_headers: { type: DataTypes.JSON, allowNull: false },
      is_error: { type: DataTypes.BOOLEAN },
      error: { type: DataTypes.JSON, allowNull: true },
      trace: { type: DataTypes.JSON, allowNull: false },
      started_at: { type: DataTypes.DATE, allowNull: false },
      completed_at: { type: DataTypes.DATE, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'LogRequest',
      tableName: 'log_request',
      underscored: true,
    },
  );

  return LogRequest;
}

export default init;
