// Woorden voor receptenboek-codes: kort, gangbaar, zonder accenten.
const LIST = `
appel peer banaan kers pruim druif meloen limoen mango kiwi vijg dadel bes braam perzik noot pinda
kokos rozijn krent honing suiker zout peper kaneel anijs kerrie komijn azijn olie boter kaas melk
room kwark eier brood koek taart cake wafel vla pap rijst pasta noedel soep saus jus kool spruit
sla tomaat wortel prei knol biet raap bonen boon erwt linzen mais venkel witlof radijs haring zalm
tonijn mossel krab kreeft worst spek ham gehakt lapje kroket patat friet chips drop snoep toffee
lolly cacao koffie thee sap water wijn bier jam stroop hagel pesto pizza wrap tosti bol muesli
haver gerst tarwe rogge meel gist deeg korst kruim pan pot kom bord lepel vork mes kopje glas
beker schaal deksel oven kraan spons doek schort garde zeef rasp maat tang spatel kwast plank blik
fles kurk dop kan ketel kachel tafel stoel kruk kast lade rek haak huis deur raam dak muur vloer
trap zolder kelder kamer gang hal keuken tuin schuur hek poort bank bed kussen deken laken lamp
kaars klok vaas mand doos tas koffer boek krant brief pen papier schaar lijm touw draad naald
knoop wol garen stof jas trui sok schoen laars hoed pet sjaal want riem rok broek jurk hemd bloem
roos tulp narcis lelie viool klaver gras mos varen boom eik beuk berk wilg linde den spar tak blad
zaad knop struik haag heg vijver sloot beek rivier meer zee strand duin berg dal heuvel bos wei
akker polder dijk molen brug weg pad laan plein dorp stad kerk toren markt winkel haven boot schip
zeil anker fiets trein tram bus auto wagen kar slee kat hond paard koe kalf schaap lam geit kip
haan eend gans zwaan duif mus merel mees vink specht uil valk reiger meeuw kraai ekster egel mol
muis haas konijn hert ree vos otter bever kikker slak worm hommel mier kever spin vlieg snoek
baars paling karper walvis zon maan ster wolk regen wind storm sneeuw mist dauw vorst ijs zomer
winter herfst lente maart april mei juni juli morgen middag avond nacht dag week maand jaar uur
rood blauw groen geel wit zwart bruin grijs roze paars oranje goud zilver koper ijzer staal hout
steen zand klei oma opa moeder vader tante oom neef nicht zus broer kind baby vriend buur gast kok
bakker slager boer visser dokter juf muziek lied dans feest spel bal beer puzzel kaart ring kroon
vlag bel fluit trom gitaar piano harp kruid munt dille tijm salie gember nootje koekje bakken
koken roeren mengen kneden wassen drogen vegen lucht aarde vuur vlam rook kolen turf straat steeg
stoep tegel dakpan goot balk paal hamer zaag boor beitel vijl schep hark spade gieter emmer bezem
dweil kam zeep douche bad mandje bakje potje doosje zakje bordje vlaai bolus lunch diner hapje
toetje borrel kefir feta brie gouda bosbes aalbes mispel papaja ananas guave olijf augurk rucola
paksoi okra quinoa gierst spelt bulgur schol tong tarbot sprot forel hazel pecan cashew cola toast
bagel donut muffin scone servet kopjes glazen borden lepels vorken messen pannen potten kommen
kruik karaf marmer kiezel grind schelp koraal parel amber ivoor zijde linnen katoen vilt kant
strik lint veter gesp rits zak mouw kraag zoom plooi ruit streep stip bloes vest mantel cape
pyjama badjas slof klomp muts oorbel bril kompas kijker tent rugzak kano roeier vlot sluis kade
boei golf vloed stroom bron put
`;

export const WORDS: readonly string[] = LIST.trim()
	.split(/\s+/)
	.map((w) => w.toUpperCase());
