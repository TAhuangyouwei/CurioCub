// A product vocabulary plan, not a national Grade 1 assessment word list.
const groups = [
  ['animals', '身边的动物', [
    ['dog', '小狗', 'one friendly golden-brown dog with floppy ears and a wagging tail'],
    ['cat', '小猫', 'one orange pet cat with whiskers and a curved tail'],
    ['bird', '小鸟', 'one little blue songbird with a beak, wings and two feet'],
    ['fish', '小鱼', 'one orange goldfish with fins and a flowing tail'],
    ['rabbit', '兔子', 'one white rabbit with two long upright ears'],
    ['duck', '鸭子', 'one yellow duck with a broad flat orange bill and webbed feet'],
    ['hen', '母鸡', 'one brown adult hen, clearly a female chicken, with a small red comb'],
    ['pig', '小猪', 'one pink pig with a round snout and a curly tail'],
    ['cow', '奶牛', 'one black-and-white dairy cow with visible udders'],
    ['horse', '小马', 'one chestnut horse with a mane and four hooves']
  ]],
  ['wildlife', '动物朋友', [
    ['lion', '狮子', 'one friendly male lion with a round golden mane'],
    ['tiger', '老虎', 'one friendly orange tiger with clear black stripes'],
    ['elephant', '大象', 'one gray elephant with big ears and a long trunk'],
    ['monkey', '猴子', 'one playful brown monkey with a long curved tail'],
    ['panda', '熊猫', 'one black-and-white giant panda sitting with a bamboo shoot'],
    ['bear', '小熊', 'one friendly brown bear with round ears'],
    ['giraffe', '长颈鹿', 'one giraffe with a very long neck and brown patches'],
    ['zebra', '斑马', 'one zebra with crisp black-and-white stripes'],
    ['frog', '青蛙', 'one green frog with round eyes and folded hind legs'],
    ['turtle', '乌龟', 'one small land turtle with a domed shell and four short feet']
  ]],
  ['fruit', '香甜水果', [
    ['apple', '苹果', 'one whole red apple with a short stem and a green leaf'],
    ['banana', '香蕉', 'one curved yellow banana, partly peeled'],
    ['orange', '橙子', 'one whole orange fruit with a green leaf and one cut orange half'],
    ['grape', '葡萄', 'one small bunch of purple grapes on a vine stem'],
    ['lemon', '柠檬', 'one yellow lemon and one lemon slice'],
    ['peach', '桃子', 'one pink peach with a visible crease and a green leaf'],
    ['pear', '梨', 'one green pear with its distinctive narrow top and round base'],
    ['watermelon', '西瓜', 'one triangular slice of red watermelon with black seeds and green rind'],
    ['strawberry', '草莓', 'one red strawberry with tiny seeds and a green leafy top'],
    ['cherry', '樱桃', 'two ripe red cherries joined by their stems']
  ]],
  ['colors', '缤纷颜色', [
    ['red', '红色', 'one simple solid red paint blob with smooth edges; red only'],
    ['blue', '蓝色', 'one simple solid blue paint blob with smooth edges; blue only'],
    ['yellow', '黄色', 'one simple solid yellow paint blob with smooth edges; yellow only'],
    ['green', '绿色', 'one simple solid green paint blob with smooth edges; green only'],
    ['black', '黑色', 'one simple solid black paint blob with smooth edges; black only'],
    ['white', '白色', 'one solid white paint blob with a thin pale-gray outline so white remains visible'],
    ['pink', '粉色', 'one simple solid pink paint blob with smooth edges; pink only'],
    ['purple', '紫色', 'one simple solid purple paint blob with smooth edges; purple only'],
    ['brown', '棕色', 'one simple solid brown paint blob with smooth edges; brown only'],
    ['gray', '灰色', 'one simple solid medium-gray paint blob with smooth edges; gray only']
  ]],
  ['food', '食物与饮品', [
    ['bread', '面包', 'one small loaf of bread with one slice leaning against it'],
    ['rice', '米饭', 'one bowl filled with cooked white rice'],
    ['egg', '鸡蛋', 'one whole chicken egg and one boiled egg half with a yellow yolk'],
    ['milk', '牛奶', 'one clear glass full of white milk beside a plain unlabelled milk bottle'],
    ['water', '水', 'one clear drinking glass filled with transparent water, not milk or juice'],
    ['juice', '果汁', 'one clear glass of orange juice with a straw and a small orange wedge'],
    ['cake', '蛋糕', 'one slice of strawberry sponge cake on a small plate'],
    ['cookie', '饼干', 'one round golden cookie with chocolate chips'],
    ['cheese', '奶酪', 'one yellow cheese wedge with round holes'],
    ['chicken', '鸡肉', 'one cooked chicken drumstick on a plain plate; food, not a living bird']
  ]],
  ['body', '认识身体', [
    ['head', '头', 'one friendly child head, whole head silhouette with face, hair and ears, neck cropped'],
    ['hair', '头发', 'close-up of the top and back of a child head with thick brown hair, hair emphasized'],
    ['face', '脸', 'only the front oval of a friendly child face: forehead, eyes, nose, cheeks, mouth and chin; no hair, ears or neck, clearly different from a whole head'],
    ['eye', '眼睛', 'one clear friendly human eye with eyebrow and eyelashes'],
    ['ear', '耳朵', 'one clear human outer ear viewed from the side'],
    ['nose', '鼻子', 'one clear child nose in three-quarter view with nostrils, a tiny part of cheeks for context'],
    ['mouth', '嘴巴', 'one smiling human mouth with lips, slightly open, no full face'],
    ['hand', '手', 'one open child hand, palm forward, exactly five fingers'],
    ['leg', '腿', 'one child leg shown from knee to ankle, foot only partly visible, wearing short trousers at top'],
    ['foot', '脚', 'one bare human foot in side three-quarter view, exactly five toes']
  ]],
  ['people', '家人与伙伴', [
    ['mother', '妈妈', 'one friendly adult mother holding the hand of a small child, mother is central and larger'],
    ['father', '爸爸', 'one friendly adult father holding the hand of a small child, father is central and larger'],
    ['sister', '姐姐／妹妹', 'a girl standing beside a younger sibling, the girl is central and emphasized'],
    ['brother', '哥哥／弟弟', 'a boy standing beside a younger sibling, the boy is central and emphasized'],
    ['grandmother', '奶奶／外婆', 'one friendly elderly grandmother with gray hair and glasses'],
    ['grandfather', '爷爷／外公', 'one friendly elderly grandfather with gray hair and glasses'],
    ['baby', '婴儿', 'one smiling baby sitting in a soft yellow onesie'],
    ['boy', '男孩', 'one smiling young boy standing and waving, full body'],
    ['girl', '女孩', 'one smiling young girl standing and waving, full body'],
    ['friend', '朋友', 'two cheerful children of the same age giving each other a high five']
  ]],
  ['school', '学校用品', [
    ['book', '书', 'one open picture book with blank pages and a bright blue cover'],
    ['pen', '钢笔', 'one blue fountain pen with an unmistakable metal nib, no pencil'],
    ['pencil', '铅笔', 'one yellow wooden pencil with a sharpened graphite tip and a pink eraser'],
    ['ruler', '尺子', 'one straight school ruler with tick marks but no numerals'],
    ['eraser', '橡皮', 'one pink-and-white rectangular school eraser'],
    ['bag', '书包', 'one red school backpack with two shoulder straps and a front pocket'],
    ['desk', '课桌', 'one small student desk with a pencil groove and a single school book'],
    ['chair', '椅子', 'one simple wooden child chair with a backrest and four legs'],
    ['teacher', '老师', 'one friendly adult teacher beside a small classroom board with simple star drawings, no writing'],
    ['school', '学校', 'one cheerful small school building with a school bell and a playground slide, no writing']
  ]],
  ['play', '玩具与交通', [
    ['ball', '球', 'one colorful striped play ball'],
    ['doll', '玩偶', 'one soft child doll wearing a simple dress, stitched toy features'],
    ['kite', '风筝', 'one diamond-shaped kite with a string and a ribbon tail'],
    ['robot', '机器人', 'one friendly toy robot with a square head, two arms and two legs'],
    ['car', '小汽车', 'one small red car viewed from the side with two visible wheels'],
    ['train', '火车', 'one cheerful toy locomotive with a short attached carriage'],
    ['bus', '公共汽车', 'one yellow city bus with many windows and two visible wheels'],
    ['bike', '自行车', 'one small blue bicycle with two wheels and pedals, no motor'],
    ['boat', '小船', 'one small sailboat with a triangular sail'],
    ['plane', '飞机', 'one small passenger airplane with wings and tail, three-quarter view']
  ]],
  ['clothes', '穿衣服', [
    ['shirt', '衬衫', 'one blue collared button-up shirt laid flat'],
    ['coat', '外套', 'one warm orange coat with sleeves and a front zipper'],
    ['dress', '连衣裙', 'one pink child dress with a fitted top and flared skirt'],
    ['skirt', '短裙', 'one purple skirt with a visible waistband, no top'],
    ['pants', '长裤', 'one pair of green long trousers laid flat'],
    ['shoes', '鞋子', 'one pair of red child sneakers'],
    ['socks', '袜子', 'one pair of striped child socks'],
    ['hat', '帽子', 'one yellow wide-brimmed sun hat'],
    ['cap', '鸭舌帽', 'one blue baseball cap with a front peak'],
    ['sweater', '毛衣', 'one red knitted sweater with a round neck and a simple knit texture']
  ]],
  ['home', '我的家', [
    ['house', '房子', 'one small family house with a pitched red roof, door and two windows'],
    ['door', '门', 'one wooden door with a round handle in a simple door frame'],
    ['window', '窗户', 'one square window with four glass panes and short curtains'],
    ['bed', '床', 'one small bed with a pillow and a blue blanket'],
    ['table', '桌子', 'one plain round dining table with four legs, no school items'],
    ['cup', '杯子', 'one plain green drinking cup with a handle'],
    ['plate', '盘子', 'one plain white dinner plate with a blue rim, slightly tilted'],
    ['spoon', '勺子', 'one simple silver spoon with a round bowl and long handle'],
    ['clock', '时钟', 'one round wall clock with two hands and plain tick marks, no numerals'],
    ['lamp', '台灯', 'one yellow desk lamp with a shade and a round base']
  ]],
  ['nature', '自然世界', [
    ['sun', '太阳', 'one bright yellow sun with simple rays'],
    ['moon', '月亮', 'one pale-yellow crescent moon'],
    ['star', '星星', 'one golden five-pointed star'],
    ['cloud', '云', 'one fluffy white cloud with a thin pale-blue outline'],
    ['rain', '下雨', 'one gray cloud releasing several clear blue raindrops'],
    ['snow', '下雪', 'one pale-blue cloud releasing large clearly shaped snowflakes'],
    ['tree', '树', 'one green leafy tree with a brown trunk'],
    ['flower', '花', 'one pink flower with a yellow center, green stem and two leaves'],
    ['grass', '草', 'one small tuft of fresh green grass'],
    ['leaf', '叶子', 'one green leaf with a clear central vein and a short stalk']
  ]],
  ['actions', '动一动', [
    ['run', '跑', 'one child running fast, arms bent and both feet momentarily off ground, a few motion strokes'],
    ['walk', '走', 'one child walking calmly, one foot firmly on ground and arms relaxed'],
    ['jump', '跳', 'one child jumping straight up with both feet together off ground, arms raised'],
    ['sit', '坐', 'one child sitting upright on a small chair'],
    ['sleep', '睡觉', 'one child sleeping with eyes closed in bed under a blanket, no written sleep symbols'],
    ['eat', '吃', 'one child raising a spoon of rice toward their open mouth'],
    ['drink', '喝', 'one child drinking water from a clear glass held to their lips'],
    ['read', '读', 'one child looking attentively at an open picture book with blank pages'],
    ['write', '写', 'one child using a pencil to write short abstract strokes in a notebook, no actual text'],
    ['draw', '画', 'one child using a crayon to draw a simple flower on paper']
  ]],
  ['numbers', '数字一到十', [
    ['one', '一', 'exactly ONE red apple, isolated and easy to count'],
    ['two', '二', 'exactly TWO red apples in one row, separated and easy to count'],
    ['three', '三', 'exactly THREE red apples in one row, separated and easy to count'],
    ['four', '四', 'exactly FOUR red apples in two rows of two, separated and easy to count'],
    ['five', '五', 'exactly FIVE red apples, three in the top row and two in the bottom row, easy to count'],
    ['six', '六', 'exactly SIX red apples in two rows of three, separated and easy to count'],
    ['seven', '七', 'exactly SEVEN red apples, four in the top row and three in the bottom row, easy to count'],
    ['eight', '八', 'exactly EIGHT red apples in two rows of four, separated and easy to count'],
    ['nine', '九', 'exactly NINE red apples in three rows of three, separated and easy to count'],
    ['ten', '十', 'exactly TEN red apples in two rows of five, separated and easy to count']
  ]],
  ['describing', '说说样子', [
    ['big', '大的', 'a very large red ball beside a much smaller faint gray ball; a simple arrow points to the large red ball'],
    ['small', '小的', 'a very small red ball beside a much larger faint gray ball; a simple arrow points to the small red ball'],
    ['long', '长的', 'a long blue ribbon beside a short faint gray ribbon; a simple arrow points to the long blue ribbon'],
    ['short', '短的', 'a short blue ribbon beside a long faint gray ribbon; a simple arrow points to the short blue ribbon'],
    ['tall', '高的', 'a tall green tree beside a much shorter faint gray tree; a simple arrow points to the tall green tree'],
    ['hot', '热的', 'one red mug with visible curling steam rising from a hot drink, no person touching it'],
    ['cold', '冷的', 'one clear blue glass of water with visible ice cubes and condensation droplets'],
    ['happy', '开心的', 'one child face with a big joyful smile and happy eyes'],
    ['sad', '难过的', 'one child face with a gently downturned mouth and one small tear, comforting not frightening'],
    ['clean', '干净的', 'two freshly washed child hands with a few little sparkle shapes, no dirt']
  ]]
].map(([id, title, rows]) => ({ id, title, rows }))

const legacyEnglish = new Map(require('./learning').getModule('english').items.map(unit => [unit.title, unit]))
const words = groups.flatMap(group => group.rows.map(([word, meaning, subject]) => ({
  id: word, word, meaning, topic: group.id, subject,
  image: `/packages/english-vocabulary/images/${word}.webp`,
  legacyId: legacyEnglish.has(word) ? legacyEnglish.get(word).id : '',
  audioFile: legacyEnglish.has(word) ? `/assets/audio/${legacyEnglish.get(word).audioFile}`
    : `/packages/english-vocabulary/audio/${word}.mp3`
})))

module.exports = { groups: groups.map(({ id, title }) => ({ id, title })), words }
