const levelPick = (content: string, level: number) => {
  let space = '';
  for (let i : number = 1; i <= level; i += 1) {
    space = `${space} `;
  }
  space = `${space}- ${content}`;
  return space;
};

const formatToJson = ({ data }: { [key: string]: any }) => {
  const convertedObj: { [key: string]: any } = {
    content: [],
  };

  const getListType = (listId: string) => {
    const type = data.lists[listId].listProperties.nestingLevels[0].glyphSymbol
      || data.lists[listId].listProperties.nestingLevels[0].glyphType;

    if (type === 'GLYPH_TYPE_UNSPECIFIED') {
      return 'CHECKBOX';
    }
    if (type === '●') {
      return 'UL';
    }
    if (type === 'DECIMAL') {
      return 'OL';
    }
  };

  data.body.content.forEach((block: { [key: string]: any }) => {
    if (block.paragraph) {
      const content: any[] = block.paragraph.elements.map((ele: { [key: string]: any }) => {
        if (ele.textRun && ele.textRun.content.length) {
          const styles = [];

          if (ele.textRun.textStyle.bold) {
            styles.push({
              type: 'bold',
            });
          }
          if (ele.textRun.textStyle.italic) {
            styles.push({
              type: 'italic',
            });
          }
          if (ele.textRun.textStyle.underline) {
            styles.push({
              type: 'underline',
            });
          }
          if (ele.textRun.textStyle.foregroundColor) {
            styles.push({
              type: 'foregroundColor',
              foregroundColor:
                ele.textRun.textStyle.foregroundColor.color.rgbColor,
            });
          }
          if (ele.textRun.textStyle.backgroundColor) {
            styles.push({
              type: 'backgroundColor',
              backgroundColor:
                ele.textRun.textStyle.backgroundColor.color.rgbColor,
            });
          }
          if (ele.textRun.textStyle.link) {
            styles.push({
              type: 'link',
              link: ele.textRun.textStyle.link,
            });
          }

          return {
            text: ele.textRun.content,
            style: styles,
          };
        }

        if (ele.inlineObjectElement) {
          return {
            image_url:
              data.inlineObjects[ele.inlineObjectElement.inlineObjectId]
                .inlineObjectProperties.embeddedObject.imageProperties
                .sourceUri,
          };
        }

        return null;
      });

      convertedObj.content.push({
        content,
        bullet: !!block.paragraph.bullet,
        nestingLevel: block.paragraph.bullet ? (block.paragraph.bullet.nestingLevel || 0) : null,
        blockType: block.paragraph.bullet
          ? getListType(block.paragraph.bullet.listId)
          : block.paragraph.paragraphStyle.namedStyleType,
        alignment: block.paragraph.paragraphStyle.alignment
          ? block.paragraph.paragraphStyle.alignment
          : 'START',
      });
    }
  });

  return convertedObj;
};

const formatToMarkdown = (data: { [key: string]: any }) => {
  const formatContent = (content : any[]) => content
    .map((element: { [key: string]: any }) => {
      if (element.text) {
        //  let result = element.text.replace('\n', '<br>');
        let result = element.text;
        if (!element.style.length) {
          return result;
        }

        element.style.forEach((st: { [key: string]: any }) => {
          if (st.type === 'bold') {
            result = `**${result}**`;
          }
          if (st.type === 'italic') {
            result = `*${result}*`;
          }
          if (st.type === 'link') {
            result = `[${result}](${st.link.url})`;
          }
          if (st.type === 'backgroundColor') {
            result = `${result}`;
          }
        });

        return result;
      }

      if (element.image_url) {
        return `![](${element.image_url})`;
      }

      return null;
    })
    .join('');

  const formated = data.content.map((block: { [key: string]: any }) => {
    const content = formatContent(block.content);
    switch (block.blockType) {
    case 'TITLE':
      return `# ${content}`;
    case 'SUBTITLE':
      return `## ${content}`;
    case 'HEADING_1':
      return `# ${content}`;
    case 'HEADING_2':
      return `## ${content}`;
    case 'HEADING_3':
      return `### ${content}`;
    case 'HEADING_4':
      return `#### ${content}`;
    case 'HEADING_5':
      return `##### ${content}`;
    case 'HEADING_6':
      return `###### ${content}`;
    case 'OL':
      return `${levelPick(content, block.nestingLevel)}`;
    case 'UL':
      return `${levelPick(content, block.nestingLevel)}`;
    case 'CHECKBOX':
      return `[] ${content}`;
    case 'NORMAL_TEXT':
      return content;
    default:
      return content;
    }
  });

  return formated.join('');
};

const formatToText = (data: { [key: string]: any }) => {
  const formatContent = (content: any[]) => content.map((element) => {
    if (element.text) {
      const result = element.text;
      return result;
    }

    if (element.image_url) {
      return element.image_url;
    }

    return '';
  })
    .join('');

  const formated = data.content.map((block: any) => {
    const content = formatContent(block.content);
    return block.bullet ? `${levelPick(content, block.nestingLevel)}` : content;
  });

  return formated.join('');
};

export default (data: { [key:string]: any}, format: string) => {
  if (format === 'markdown') {
    return formatToMarkdown(formatToJson(data));
  }
  if (format === 'text') {
    return formatToText(formatToJson(data));
  }
  if (format === 'json') {
    return formatToJson(data);
  }
  if (format === 'html') {
    return ''; // markdown to html
  }
  return data.data.body;
};
