export const PersonNode = ({ data, onClick, isFocused, ...rest }) => {
  return (
    <div
      {...rest}
      style={{
        color: isFocused ? 'black' : 'white',
        height: '100%',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isFocused ? 'yellow !important' : 'blue'
      }}
      onClick={onClick}
    >
      {data.name}
    </div>
  );
};
