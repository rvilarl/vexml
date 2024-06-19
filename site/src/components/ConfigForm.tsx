import * as vexml from '@/index';
import { useId, useRef, useState } from 'react';

export type ConfigFormProps = {
  defaultValue?: vexml.Config;
  onChange(config: vexml.Config): void;
};

export const ConfigForm = (props: ConfigFormProps) => {
  const [config, setConfig] = useState(props.defaultValue ?? vexml.DEFAULT_CONFIG);

  const updateNow = (config: vexml.Config) => {
    props.onChange(config);
  };

  const timeoutRef = useRef(0);
  const updateLater = (config: vexml.Config) => {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      props.onChange(config);
    }, 500);
  };

  function get<T>(key: string): T {
    return config[key as keyof vexml.Config] as T;
  }

  function set<T>(key: string) {
    return (value: T) => {
      const nextConfig = { ...config, [key]: value };
      setConfig(nextConfig);
      if (typeof value === 'string' || typeof value === 'number') {
        updateLater(nextConfig);
      } else {
        updateNow(nextConfig);
      }
    };
  }

  function render(key: string, descriptor: vexml.SchemaDescriptor): React.ReactNode {
    const label = key
      .split('_')
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    switch (descriptor.type) {
      case 'string':
        return <StringInput key={key} label={label} value={get<string>(key)} onChange={set<string>(key)} />;
      case 'number':
        return <NumberInput key={key} label={label} value={get<number>(key)} onChange={set<number>(key)} />;
      case 'boolean':
        return <BooleanInput key={key} label={label} value={get<boolean>(key)} onChange={set<boolean>(key)} />;
      case 'enum':
        return (
          <EnumInput
            key={key}
            label={label}
            value={get<string>(key)}
            choices={descriptor.choices}
            onChange={set<string>(key)}
          />
        );
      case 'debug':
        return render(key, descriptor.child);
    }
  }

  function onResetClick() {
    const nextConfig = vexml.DEFAULT_CONFIG;
    setConfig(nextConfig);
    updateNow(nextConfig);
  }

  const isResetButtonDisabled = Object.entries(config).every(
    ([key, value]) => value === vexml.DEFAULT_CONFIG[key as keyof vexml.Config]
  );

  return (
    <div>
      <div className="row g-3">
        {Object.entries(vexml.CONFIG_SCHEMA).map(([key, value]) => (
          <div key={key} className="col-md-6 col-lg-4">
            {render(key, value)}
          </div>
        ))}
      </div>

      <br />

      <div className="d-grid">
        <button className="btn btn-danger btn-lg" onClick={onResetClick} disabled={isResetButtonDisabled}>
          <i className="bi bi-arrow-counterclockwise"></i> Reset Config
        </button>
      </div>
    </div>
  );
};

const StringInput = (props: { label: string; value: string; onChange(value: string): void }) => {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {props.label}
      </label>
      <input id={id} className="form-control" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
};

const NumberInput = (props: { label: string; value: number; onChange(value: number): void }) => {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {props.label}
      </label>
      <input
        id={id}
        type="number"
        className="form-control"
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
};

const BooleanInput = (props: { label: string; value: boolean; onChange(value: boolean): void }) => {
  const id = useId();

  return (
    <div className="form-check">
      <input
        id={id}
        className="form-check-input"
        type="checkbox"
        checked={props.value}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <label htmlFor={id} className="form-check-label">
        {props.label}
      </label>
    </div>
  );
};

const EnumInput = (props: {
  label: string;
  value: string;
  choices: readonly string[];
  onChange(value: string): void;
}) => {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-2">
        {props.label}
      </label>
      <select id={id} className="form-select" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </div>
  );
};
