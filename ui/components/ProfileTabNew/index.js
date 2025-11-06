import React from 'react';

const ProfileTab = ({
  name,
  title='',
  avatar,
  i18n = {},
  children,
  onClick,
}) => {
  let image = null;
  if (typeof avatar === 'object' && !avatar.src) {
    image = avatar.google || avatar.googlesheet || avatar.googledocs || avatar.twitter;
  } else {
    image = avatar.src;
  }
  return (
    <>
      <div className="flex flex-col items-start p-1 bg-gray-100" >
        <div className={`rounded-full p-1 `}>
          <img
            data-tip={title}
            title={title}
            className="inline-block h-6 w-6 rounded-full"
            src={image}
            alt={name}
          />
        </div>
        <div className="">
          {
            onClick ? 
              <p className="text-xs leading-4 text-gray-500 group-hover:text-gray-700 transition ease-in-out duration-150">
                <button
                  type="button"
                  className="underline cursor-pointer"
                  onClick={onClick}
                >
                  {i18n.logout_txt || 'Logout'}
                </button>
              </p> 
            : <>{children}</>
          }
        </div>
      </div>
    </>
  )
};

export default ProfileTab;
